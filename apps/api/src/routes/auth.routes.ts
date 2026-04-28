import { Router } from "express";
import type { CookieOptions } from "express";
import { z } from "zod";
import { carrierOnboardingSchema, loginSchema, registerSchema } from "@zulla/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authService } from "../services/auth.service.js";
import { carrierService } from "../services/carrier.service.js";

export const authRouter: Router = Router();

const REFRESH_COOKIE = "zl_rt";
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/api/v1/auth",
  maxAge: REFRESH_TTL_MS,
};

authRouter.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Carrier multi-step final submit: creates user + carrier profile + runs FMCSA +
// auto-approves when clean. Mounted under /auth per spec; the underlying logic
// lives in carrierService.registerWithOnboarding so it can be reused.
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

authRouter.post("/register/carrier", validate(carrierRegisterSchema), async (req, res, next) => {
  try {
    const result = await carrierService.registerWithOnboarding(req.body);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { user, tokens } = await authService.login(req.body);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    res.json({
      ok: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const cookie = req.cookies?.[REFRESH_COOKIE];
    if (!cookie) {
      return res.status(401).json({ ok: false, error: { message: "No refresh token" } });
    }
    const { user, tokens } = await authService.refresh(cookie);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, refreshCookieOptions);
    res.json({
      ok: true,
      data: {
        user,
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", requireAuth(), async (req, res, next) => {
  try {
    await authService.logout(req.user!.id);
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: 0 });
    res.json({ ok: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/verify-email", async (req, res, next) => {
  try {
    const token = String(req.query.token ?? "");
    if (!token) {
      return res.status(400).json({ ok: false, error: { message: "token required" } });
    }
    await authService.verifyEmail(token);
    res.json({ ok: true, data: { verified: true } });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth(), (req, res) => {
  res.json({ ok: true, data: req.user });
});
