import { Router } from "express";
import { z } from "zod";
import { carrierOnboardingSchema } from "@zulla/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { carrierService } from "../services/carrier.service.js";
import { fmcsa } from "../lib/fmcsa.js";

export const carriersRouter: Router = Router();

// Public FMCSA verification — used by the onboarding wizard before account exists.
carriersRouter.get("/verify-fmcsa", optionalAuth, async (req, res, next) => {
  try {
    const mc = String(req.query.mc ?? "").trim();
    const dot = String(req.query.dot ?? "").trim();
    if (!mc && !dot) {
      return res.status(400).json({ ok: false, error: { message: "mc or dot required" } });
    }
    const snapshot = mc ? await fmcsa.lookupByMc(mc) : await fmcsa.lookupByDot(dot);
    res.json({ ok: true, data: fmcsa.summarize(snapshot) });
  } catch (err) {
    next(err);
  }
});

// Carrier-led registration — replaces /auth/register for carriers and chains the
// 6 onboarding steps into one transaction. See carrierService.registerWithOnboarding.
const carrierRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  companyName: z.string().min(1).max(256),
  contactName: z.string().min(1).max(256),
  phone: z.string().max(32),
  yearsInBusiness: z.string().optional(),
  numberOfTrucks: z.string().optional(),
  onboarding: carrierOnboardingSchema,
});

carriersRouter.post(
  "/register",
  validate(carrierRegisterSchema),
  async (req, res, next) => {
    try {
      const result = await carrierService.registerWithOnboarding(req.body);
      res.status(201).json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ----- Authenticated -----
carriersRouter.use(requireAuth());

carriersRouter.get("/", requireAuth(["admin", "agent"]), async (_req, res, next) => {
  try {
    const carriers = await carrierService.list();
    res.json({ ok: true, data: carriers });
  } catch (err) {
    next(err);
  }
});

carriersRouter.get("/me", requireAuth(["carrier"]), async (req, res, next) => {
  try {
    const carrier = await carrierService.getByUser(req.user!.id);
    res.json({ ok: true, data: carrier });
  } catch (err) {
    next(err);
  }
});

// Carrier self-edit (equipment, lanes, factoring, banking, etc.).
carriersRouter.patch(
  "/me",
  requireAuth(["carrier"]),
  validate(carrierOnboardingSchema),
  async (req, res, next) => {
    try {
      const updated = await carrierService.onboard(req.user!.id, req.body);
      res.json({ ok: true, data: updated });
    } catch (err) {
      next(err);
    }
  },
);

carriersRouter.get("/:id", async (req, res, next) => {
  try {
    const carrier = await carrierService.getById(req.params.id);
    res.json({ ok: true, data: carrier });
  } catch (err) {
    next(err);
  }
});

carriersRouter.post(
  "/onboard",
  requireAuth(["carrier"]),
  validate(carrierOnboardingSchema),
  async (req, res, next) => {
    try {
      const carrier = await carrierService.onboard(req.user!.id, req.body);
      res.status(201).json({ ok: true, data: carrier });
    } catch (err) {
      next(err);
    }
  },
);

carriersRouter.post(
  "/:id/approve",
  requireAuth(["admin", "agent"]),
  async (req, res, next) => {
    try {
      const carrier = await carrierService.approve(req.params.id, req.user!);
      res.json({ ok: true, data: carrier });
    } catch (err) {
      next(err);
    }
  },
);

carriersRouter.post(
  "/:id/suspend",
  requireAuth(["admin", "agent"]),
  async (req, res, next) => {
    try {
      const carrier = await carrierService.suspend(req.params.id, req.user!, req.body?.reason);
      res.json({ ok: true, data: carrier });
    } catch (err) {
      next(err);
    }
  },
);

const rejectSchema = z.object({ reason: z.string().min(1).max(500) });
carriersRouter.post(
  "/:id/reject",
  requireAuth(["admin"]),
  validate(rejectSchema),
  async (req, res, next) => {
    try {
      const carrier = await carrierService.reject(req.params.id, req.user!, req.body.reason);
      res.json({ ok: true, data: carrier });
    } catch (err) {
      next(err);
    }
  },
);

const dnuSchema = z.object({ reason: z.string().min(1).max(500) });
const dnuHandler = async (
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) => {
  try {
    const carrier = await carrierService.suspend(req.params.id, req.user!, req.body.reason);
    res.json({ ok: true, data: carrier });
  } catch (err) {
    next(err);
  }
};
carriersRouter.post("/:id/dnu", requireAuth(["admin"]), validate(dnuSchema), dnuHandler);
// Backwards-compat alias retained for any caller still using /flag-dnu.
carriersRouter.post("/:id/flag-dnu", requireAuth(["admin"]), validate(dnuSchema), dnuHandler);
