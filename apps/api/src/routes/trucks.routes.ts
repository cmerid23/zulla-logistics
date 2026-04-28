import { Router } from "express";
import { createTruckSchema } from "@zulla/shared";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { truckService } from "../services/truck.service.js";

export const trucksRouter: Router = Router();

trucksRouter.use(requireAuth(["carrier"]));

trucksRouter.get("/", async (req, res, next) => {
  try {
    const rows = await truckService.list(req.user!);
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

trucksRouter.post("/", validate(createTruckSchema), async (req, res, next) => {
  try {
    const row = await truckService.create(req.body, req.user!);
    res.status(201).json({ ok: true, data: row });
  } catch (err) {
    next(err);
  }
});
