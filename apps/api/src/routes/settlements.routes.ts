import { Router } from "express";
import { settlementFactorSchema, settlementGenerateSchema } from "@zulla/shared";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { settlementService } from "../services/settlement.service.js";
import { getPresignedDownloadUrl } from "../lib/r2.js";

export const settlementsRouter: Router = Router();

settlementsRouter.use(requireAuth(["carrier", "admin"]));

settlementsRouter.get("/", async (req, res, next) => {
  try {
    const rows = await settlementService.list(req.user!);
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

settlementsRouter.get("/:id/pdf", async (req, res, next) => {
  try {
    const rows = await settlementService.list(req.user!);
    const settlement = rows.find((s) => s.id === req.params.id);
    if (!settlement || !settlement.pdfR2Key) {
      return res.status(404).json({ ok: false, error: { message: "Settlement PDF not found" } });
    }
    const url = await getPresignedDownloadUrl(settlement.pdfR2Key);
    res.json({ ok: true, data: { url } });
  } catch (err) {
    next(err);
  }
});

settlementsRouter.post(
  "/:loadId/generate",
  validate(settlementGenerateSchema),
  async (req, res, next) => {
    try {
      const row = await settlementService.generate(req.params.loadId, req.body, req.user!);
      res.status(201).json({ ok: true, data: row });
    } catch (err) {
      next(err);
    }
  },
);

settlementsRouter.post(
  "/:id/factor",
  validate(settlementFactorSchema),
  async (req, res, next) => {
    try {
      const row = await settlementService.submitFactoring(req.params.id, req.body, req.user!);
      res.json({ ok: true, data: row });
    } catch (err) {
      next(err);
    }
  },
);

settlementsRouter.patch("/:id/paid", async (req, res, next) => {
  try {
    const row = await settlementService.markPaid(req.params.id, req.user!);
    res.json({ ok: true, data: row });
  } catch (err) {
    next(err);
  }
});
