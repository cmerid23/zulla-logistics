import { Router } from "express";
import { createDriverSchema, updateDriverSchema } from "@zulla/shared";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { driverService } from "../services/driver.service.js";

export const driversRouter: Router = Router();

driversRouter.use(requireAuth(["carrier"]));

driversRouter.get("/", async (req, res, next) => {
  try {
    const rows = await driverService.list(req.user!);
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

driversRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await driverService.getById(req.params.id, req.user!);
    res.json({ ok: true, data: row });
  } catch (err) {
    next(err);
  }
});

driversRouter.post("/", validate(createDriverSchema), async (req, res, next) => {
  try {
    const row = await driverService.create(req.body, req.user!);
    res.status(201).json({ ok: true, data: row });
  } catch (err) {
    next(err);
  }
});

driversRouter.patch("/:id", validate(updateDriverSchema), async (req, res, next) => {
  try {
    const row = await driverService.update(req.params.id, req.body, req.user!);
    res.json({ ok: true, data: row });
  } catch (err) {
    next(err);
  }
});
