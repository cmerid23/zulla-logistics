import { Router } from "express";
import { dqDocumentRecordSchema } from "@zulla/shared";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { dqService } from "../services/dq.service.js";

export const dqRouter: Router = Router();

dqRouter.use(requireAuth(["carrier", "admin"]));

dqRouter.get("/:driverId", async (req, res, next) => {
  try {
    const status = await dqService.status(req.params.driverId as string, req.user!);
    res.json({ ok: true, data: status });
  } catch (err) {
    next(err);
  }
});

dqRouter.post(
  "/:driverId/documents",
  validate(dqDocumentRecordSchema),
  async (req, res, next) => {
    try {
      const doc = await dqService.record(req.params.driverId as string, req.body, req.user!);
      res.status(201).json({ ok: true, data: doc });
    } catch (err) {
      next(err);
    }
  },
);
