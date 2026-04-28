import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, trackingEvents, loads } from "@zulla/db";
import { trackingEventSchema } from "@zulla/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

export const trackingRouter: Router = Router();

// Public load lookup by tracking link token (shipper "track my shipment" page).
trackingRouter.get("/public/:token", optionalAuth, async (req, res, next) => {
  try {
    const load = await db.query.loads.findFirst({
      where: eq(loads.trackingLinkToken, req.params.token),
    });
    if (!load) {
      return res.status(404).json({ ok: false, error: { message: "Load not found" } });
    }
    const events = await db
      .select()
      .from(trackingEvents)
      .where(eq(trackingEvents.loadId, load.id));
    res.json({
      ok: true,
      data: {
        reference: load.referenceNumber,
        status: load.status,
        eta: load.deliveryDate,
        events,
      },
    });
  } catch (err) {
    next(err);
  }
});

trackingRouter.use(requireAuth());

trackingRouter.post("/event", validate(trackingEventSchema), async (req, res, next) => {
  try {
    const body = req.body as {
      loadId: string;
      latitude?: number;
      longitude?: number;
      statusUpdate?: string;
      source?: string;
      timestamp?: string;
    };
    const [created] = await db
      .insert(trackingEvents)
      .values({
        loadId: body.loadId,
        latitude: body.latitude?.toString() ?? null,
        longitude: body.longitude?.toString() ?? null,
        statusUpdate: body.statusUpdate ?? null,
        source: body.source ?? "carrier_app",
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      })
      .returning();
    res.status(201).json({ ok: true, data: created });
  } catch (err) {
    next(err);
  }
});

trackingRouter.get("/loads/:loadId", async (req, res, next) => {
  try {
    const events = await db
      .select()
      .from(trackingEvents)
      .where(eq(trackingEvents.loadId, req.params.loadId));
    res.json({ ok: true, data: { loadId: req.params.loadId, events } });
  } catch (err) {
    next(err);
  }
});
