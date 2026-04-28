import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, shipperLeads, agents } from "@zulla/db";
import { validate } from "../middleware/validate.js";
import { rateService } from "../services/rate.service.js";
import { resend } from "../lib/resend.js";
import { twilio } from "../lib/twilio.js";

export const quoteRouter: Router = Router();

const quoteSchema = z.object({
  originCity: z.string().min(1),
  originState: z.string().length(2),
  destCity: z.string().min(1),
  destState: z.string().length(2),
  equipmentType: z.string().min(1),
  weight: z.number().int().positive().optional(),
  frequency: z.enum(["spot", "weekly", "monthly", "dedicated"]),
  pickupAt: z.string().datetime().optional(),
  specialRequirements: z.string().max(2000).optional(),
  companyName: z.string().min(1).max(256),
  contactName: z.string().min(1).max(256),
  email: z.string().email(),
  phone: z.string().min(7).max(32),
});

// Public — capacity request from /quote. Creates lead, runs Claude rate
// estimate, notifies the territory agent, sends shipper a confirmation.
quoteRouter.post("/", validate(quoteSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof quoteSchema>;

    const suggestion = await rateService
      .suggest({
        originCity: body.originCity,
        originState: body.originState,
        destinationCity: body.destCity,
        destinationState: body.destState,
        equipmentType: body.equipmentType,
        weightLbs: body.weight,
        pickupDate: body.pickupAt,
      })
      .catch(() => null);

    // Pick the first active agent in this origin state as the "territory agent".
    const territoryAgent = await db.query.agents.findFirst({ where: eq(agents.active, true) });

    const [lead] = await db
      .insert(shipperLeads)
      .values({
        originCity: body.originCity,
        originState: body.originState,
        destCity: body.destCity,
        destState: body.destState,
        equipmentType: body.equipmentType,
        frequency: body.frequency,
        weight: body.weight ?? null,
        companyName: body.companyName,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        estimatedRate: suggestion ? suggestion.shipperRate.toFixed(2) : null,
        assignedAgentId: territoryAgent?.id ?? null,
        status: "new",
        notes: body.specialRequirements ?? null,
      })
      .returning();

    // Confirmation to the shipper.
    const rateLine = suggestion
      ? `<p>Estimated lane rate: <strong>$${suggestion.shipperRate.toFixed(0)}</strong> (range based on ${suggestion.marginPct.toFixed(1)}% margin).</p>`
      : "";
    resend
      .send({
        to: body.email,
        subject: `Zulla — capacity request received`,
        html: `<p>Thanks ${body.contactName}, we received your request for ${body.originCity}, ${body.originState} → ${body.destCity}, ${body.destState}.</p>${rateLine}<p>An agent will contact you within 2 hours.</p>`,
      })
      .catch((err) => console.warn("[quote] confirmation email failed", err));

    // Notify territory agent (best effort).
    const adminPhone = process.env.ADMIN_REVIEW_PHONE;
    if (adminPhone) {
      twilio
        .sendSms(
          adminPhone,
          `Zulla lead: ${body.companyName} · ${body.originState}→${body.destState} · ${body.frequency}`,
        )
        .catch((err) => console.warn("[quote] sms notify failed", err));
    }

    res.status(201).json({
      ok: true,
      data: {
        leadId: lead.id,
        estimatedRate: suggestion?.shipperRate ?? null,
        marginPct: suggestion?.marginPct ?? null,
        rationale: suggestion?.rationale ?? null,
        message: "An agent will contact you within 2 hours.",
      },
    });
  } catch (err) {
    next(err);
  }
});
