import { Router } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db, trackingEvents, loads, drivers, trucks, loadAssignments, carriers } from "@zulla/db";
import { assignLoadSchema, createLoadSchema, loadFiltersSchema, updateLoadSchema } from "@zulla/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { loadService } from "../services/load.service.js";
import { HttpError } from "../middleware/errorHandler.js";

export const loadsRouter: Router = Router();

// SSE stream — mounted before requireAuth so we can do our own auth-via-query
// for EventSource clients (which can't set headers). Falls back to the standard
// Authorization header when present.
loadsRouter.get("/:id/events", requireAuth(["admin", "shipper", "carrier", "agent"]), (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let lastSentId: string | null = null;
  const interval = setInterval(async () => {
    try {
      const [latest] = await db
        .select()
        .from(trackingEvents)
        .where(eq(trackingEvents.loadId, req.params.id))
        .orderBy(desc(trackingEvents.timestamp))
        .limit(1);
      if (latest && latest.id !== lastSentId) {
        lastSentId = latest.id;
        res.write(`data: ${JSON.stringify(latest)}\n\n`);
      } else {
        // Heartbeat — keeps proxies and the EventSource alive when nothing new.
        res.write(": ping\n\n");
      }
    } catch (err) {
      console.warn("[sse]", err);
    }
  }, 5000);

  req.on("close", () => clearInterval(interval));
});

loadsRouter.use(requireAuth());

loadsRouter.get("/", validate(loadFiltersSchema, "query"), async (req, res, next) => {
  try {
    const result = await loadService.list(req.query as never, req.user!);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

loadsRouter.get("/:id", async (req, res, next) => {
  try {
    const load = await loadService.getById(req.params.id, req.user!);
    res.json({ ok: true, data: load });
  } catch (err) {
    next(err);
  }
});

loadsRouter.post(
  "/",
  requireAuth(["admin", "agent", "shipper"]),
  validate(createLoadSchema),
  async (req, res, next) => {
    try {
      const load = await loadService.create(req.body, req.user!);
      res.status(201).json({ ok: true, data: load });
    } catch (err) {
      next(err);
    }
  },
);

loadsRouter.patch(
  "/:id",
  requireAuth(["admin", "agent", "shipper"]),
  validate(updateLoadSchema),
  async (req, res, next) => {
    try {
      const load = await loadService.update(req.params.id, req.body, req.user!);
      res.json({ ok: true, data: load });
    } catch (err) {
      next(err);
    }
  },
);

loadsRouter.post("/:id/book", requireAuth(["carrier"]), async (req, res, next) => {
  try {
    const result = await loadService.book(req.params.id, req.user!);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
});

const verifyRateConSchema = z.object({ code: z.string().length(6) });

loadsRouter.post(
  "/:id/verify-ratecon",
  requireAuth(["carrier"]),
  validate(verifyRateConSchema),
  async (req, res, next) => {
    try {
      const result = await loadService.verifyRateCon(req.params.id, req.body.code, req.user!);
      res.json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

const statusUpdateSchema = z.object({
  status: z.enum(["in_transit", "delivered"]),
});

loadsRouter.patch(
  "/:id/status",
  requireAuth(["carrier"]),
  validate(statusUpdateSchema),
  async (req, res, next) => {
    try {
      const result = await loadService.updateStatus(req.params.id, req.body.status, req.user!);
      res.json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

const trackingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  statusUpdate: z.string().max(256).optional(),
});

loadsRouter.post(
  "/:id/tracking",
  requireAuth(["carrier"]),
  validate(trackingSchema),
  async (req, res, next) => {
    try {
      const result = await loadService.recordTracking(req.params.id, req.body, req.user!);
      res.status(201).json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

loadsRouter.post(
  "/:id/cancel",
  requireAuth(["admin", "agent", "shipper"]),
  async (req, res, next) => {
    try {
      const load = await loadService.cancel(req.params.id, req.user!);
      res.json({ ok: true, data: load });
    } catch (err) {
      next(err);
    }
  },
);

// Carrier dispatch — assign a driver + truck to a booked load. Both must belong
// to this carrier; we upsert so re-dispatching swaps the assignment cleanly.
loadsRouter.post(
  "/:id/assign",
  requireAuth(["carrier"]),
  validate(assignLoadSchema),
  async (req, res, next) => {
    try {
      const carrier = await db.query.carriers.findFirst({
        where: eq(carriers.userId, req.user!.id),
      });
      if (!carrier) throw new HttpError(400, "Carrier profile not found");

      const load = await db.query.loads.findFirst({ where: eq(loads.id, req.params.id) });
      if (!load) throw new HttpError(404, "Load not found");
      if (load.carrierId !== carrier.id) throw new HttpError(403, "Not your load");

      const driver = await db.query.drivers.findFirst({
        where: and(eq(drivers.id, req.body.driverId), eq(drivers.carrierId, carrier.id)),
      });
      if (!driver) throw new HttpError(404, "Driver not found");

      const truck = await db.query.trucks.findFirst({
        where: and(eq(trucks.id, req.body.truckId), eq(trucks.carrierId, carrier.id)),
      });
      if (!truck) throw new HttpError(404, "Truck not found");

      // Replace any existing assignment for this load.
      await db.delete(loadAssignments).where(eq(loadAssignments.loadId, load.id));

      const [created] = await db
        .insert(loadAssignments)
        .values({
          loadId: load.id,
          driverId: driver.id,
          truckId: truck.id,
          assignedBy: req.user!.id,
        })
        .returning();
      res.status(201).json({ ok: true, data: created });
    } catch (err) {
      next(err);
    }
  },
);

// Read current assignment(s) for a load — used by the dispatch board UI.
loadsRouter.get("/:id/assignment", requireAuth(["carrier", "admin"]), async (req, res, next) => {
  try {
    const rows = await db
      .select({
        assignment: loadAssignments,
        driver: drivers,
        truck: trucks,
      })
      .from(loadAssignments)
      .leftJoin(drivers, eq(drivers.id, loadAssignments.driverId))
      .leftJoin(trucks, eq(trucks.id, loadAssignments.truckId))
      .where(eq(loadAssignments.loadId, req.params.id))
      .orderBy(desc(loadAssignments.assignedAt))
      .limit(1);
    res.json({ ok: true, data: rows[0] ?? null });
  } catch (err) {
    next(err);
  }
});
