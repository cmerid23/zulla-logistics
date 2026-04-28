import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { rateService } from "../services/rate.service.js";
import { ask as askAi } from "../lib/ai.js";

const rateRequestSchema = z.object({
  originCity: z.string(),
  originState: z.string().length(2),
  destinationCity: z.string(),
  destinationState: z.string().length(2),
  equipmentType: z.string(),
  pickupDate: z.string().optional(),
  weightLbs: z.number().int().positive().optional(),
});

const askSchema = z.object({
  prompt: z.string().min(1).max(8000),
  context: z.unknown().optional(),
});

export const aiRouter: Router = Router();

aiRouter.use(requireAuth());

aiRouter.post("/rate-suggestion", validate(rateRequestSchema), async (req, res, next) => {
  try {
    const suggestion = await rateService.suggest(req.body);
    res.json({ ok: true, data: suggestion });
  } catch (err) {
    next(err);
  }
});

aiRouter.post("/ask", validate(askSchema), async (req, res, next) => {
  try {
    const answer = await askAi(req.body.prompt, req.body.context);
    res.json({ ok: true, data: { answer } });
  } catch (err) {
    next(err);
  }
});
