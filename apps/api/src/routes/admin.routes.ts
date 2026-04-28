import { Router } from "express";
import { z } from "zod";
import { and, eq, gte, sql, inArray } from "drizzle-orm";
import {
  db,
  loads,
  carriers,
  shippers,
  users,
  agents,
  agentCommissions,
} from "@zulla/db";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { dat } from "../lib/dat.js";
import { notificationService } from "../services/notification.service.js";

export const adminRouter: Router = Router();

adminRouter.use(requireAuth(["admin"]));

// ----- KPI + chart data for /admin (spec uses /dashboard) -----
adminRouter.get("/dashboard", async (req, res, next) => statsHandler(req, res, next));
adminRouter.get("/stats", async (req, res, next) => statsHandler(req, res, next));

// All loads — admin alias.
adminRouter.get("/loads", async (_req, res, next) => {
  try {
    const rows = await db.select().from(loads);
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// DAT responses for a specific load (inquiries returned by DAT One).
adminRouter.get("/loads/:id/dat-responses", async (req, res, next) => {
  try {
    const load = await db.query.loads.findFirst({ where: eq(loads.id, req.params.id) });
    if (!load) {
      return res.status(404).json({ ok: false, error: { message: "Load not found" } });
    }
    if (!load.datPostingId) {
      return res.json({ ok: true, data: { datPostingId: null, inquiries: [] } });
    }
    const inquiries = await dat.getPostingResponses(load.datPostingId).catch(() => []);
    res.json({ ok: true, data: { datPostingId: load.datPostingId, inquiries } });
  } catch (err) {
    next(err);
  }
});

// Pay-commission alias under /admin (spec).
adminRouter.post("/agents/:id/pay-commission", async (req, res, next) => {
  try {
    const updated = await db
      .update(agentCommissions)
      .set({ status: "paid", paidAt: new Date() })
      .where(and(eq(agentCommissions.agentId, req.params.id), eq(agentCommissions.status, "pending")))
      .returning();
    const totalPaid = updated.reduce((sum, r) => sum + Number(r.commissionAmount), 0);
    res.json({ ok: true, data: { agentId: req.params.id, count: updated.length, totalPaid } });
  } catch (err) {
    next(err);
  }
});

// Underlying stats handler — used by both /dashboard and /stats.
async function statsHandler(
  _req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  try {
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const [
      [{ totalLoads = 0 } = {}],
      [{ grossRevenue = 0 } = {}],
      [{ brokerMargin = 0 } = {}],
      [{ avgMargin = 0 } = {}],
      [{ activeCarriers = 0 } = {}],
      [{ activeShippers = 0 } = {}],
      [{ pendingApplications = 0 } = {}],
    ] = await Promise.all([
      db.select({ totalLoads: sql<number>`count(*)::int` }).from(loads),
      db.select({ grossRevenue: sql<number>`coalesce(sum(${loads.shipperRate}),0)::float` }).from(loads),
      db.select({ brokerMargin: sql<number>`coalesce(sum(${loads.brokerMargin}),0)::float` }).from(loads),
      db.select({ avgMargin: sql<number>`coalesce(avg(${loads.brokerMarginPct}),0)::float` }).from(loads),
      db.select({ activeCarriers: sql<number>`count(*)::int` }).from(carriers).where(eq(carriers.onboardingComplete, true)),
      db.select({ activeShippers: sql<number>`count(*)::int` }).from(shippers),
      db.select({ pendingApplications: sql<number>`count(*)::int` }).from(carriers).where(eq(carriers.onboardingComplete, false)),
    ]);

    // Loads-per-day for the last 30 days.
    const perDay = await db
      .select({
        day: sql<string>`to_char(${loads.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(loads)
      .where(gte(loads.createdAt, since30))
      .groupBy(sql`to_char(${loads.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${loads.createdAt}, 'YYYY-MM-DD')`);

    // Margin per ISO week (last 12 weeks).
    const marginByWeek = await db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${loads.createdAt}), 'YYYY-MM-DD')`,
        margin: sql<number>`coalesce(sum(${loads.brokerMargin}),0)::float`,
      })
      .from(loads)
      .groupBy(sql`date_trunc('week', ${loads.createdAt})`)
      .orderBy(sql`date_trunc('week', ${loads.createdAt}) desc`)
      .limit(12);

    res.json({
      ok: true,
      data: {
        kpis: {
          totalLoads,
          grossRevenue,
          brokerMargin,
          avgMargin,
          activeCarriers,
          activeShippers,
          pendingApplications,
        },
        loadsPerDay: perDay,
        marginByWeek: marginByWeek.reverse(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ----- Users (admin can list all) -----
adminRouter.get("/users", async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        companyName: users.companyName,
        contactName: users.contactName,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users);
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/users/:id/disable", async (req, res, next) => {
  try {
    // Soft-disable by clearing the refresh token; we don't have an isActive column.
    await db.update(users).set({ refreshToken: null }).where(eq(users.id, req.params.id));
    res.json({ ok: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

// ----- Loads: edit controls + bulk export + DAT posting -----
const reassignSchema = z.object({ carrierId: z.string().uuid() });
adminRouter.patch("/loads/:id/reassign", validate(reassignSchema), async (req, res, next) => {
  try {
    const [updated] = await db
      .update(loads)
      .set({ carrierId: req.body.carrierId, updatedAt: new Date() })
      .where(eq(loads.id, req.params.id))
      .returning();
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

const forceStatusSchema = z.object({
  status: z.enum([
    "draft", "posted", "booked", "in_transit", "delivered", "invoiced", "paid", "cancelled",
  ]),
});
adminRouter.patch("/loads/:id/status", validate(forceStatusSchema), async (req, res, next) => {
  try {
    const [updated] = await db
      .update(loads)
      .set({ status: req.body.status, updatedAt: new Date() })
      .where(eq(loads.id, req.params.id))
      .returning();
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

const noteSchema = z.object({ note: z.string().max(4000) });
adminRouter.patch("/loads/:id/note", validate(noteSchema), async (req, res, next) => {
  try {
    const [updated] = await db
      .update(loads)
      .set({ internalNotes: req.body.note, updatedAt: new Date() })
      .where(eq(loads.id, req.params.id))
      .returning();
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

const bulkExportSchema = z.object({ ids: z.array(z.string().uuid()).max(1000) });
adminRouter.post("/loads/bulk-export", validate(bulkExportSchema), async (req, res, next) => {
  try {
    const ids = req.body.ids as string[];
    if (!ids.length) return res.send("no rows");
    const rows = await db.select().from(loads).where(inArray(loads.id, ids));

    const header = [
      "reference_number", "status", "origin", "destination", "equipment",
      "pickup_date", "delivery_date", "miles", "shipper_rate", "carrier_rate", "broker_margin",
    ].join(",");
    const csvRows = rows.map((l) =>
      [
        l.referenceNumber ?? l.id,
        l.status,
        `"${l.originCity}, ${l.originState}"`,
        `"${l.destinationCity}, ${l.destinationState}"`,
        l.equipmentType,
        l.pickupDate?.toISOString() ?? "",
        l.deliveryDate?.toISOString() ?? "",
        l.distanceMiles ?? "",
        l.shipperRate ?? "",
        l.carrierRate ?? "",
        l.brokerMargin ?? "",
      ].join(","),
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="zulla-loads-export.csv"`);
    res.send([header, ...csvRows].join("\n"));
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/loads/:id/post-dat", async (req, res, next) => {
  try {
    const load = await db.query.loads.findFirst({ where: eq(loads.id, req.params.id) });
    if (!load) return res.status(404).json({ ok: false, error: { message: "Load not found" } });
    const result = await dat.postLoad(load).catch((err) => ({ error: (err as Error).message }));
    if ("error" in result) {
      return res.status(502).json({ ok: false, error: { message: result.error } });
    }
    const [updated] = await db
      .update(loads)
      .set({ datPosted: true, datPostingId: result.datPostingId, updatedAt: new Date() })
      .where(eq(loads.id, load.id))
      .returning();
    res.json({ ok: true, data: { load: updated, datStatus: result.status, inquiries: result.inquiries ?? [] } });
  } catch (err) {
    next(err);
  }
});

// ----- Shippers: inline edit credit limit + payment terms -----
const shipperEditSchema = z.object({
  creditLimit: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  paymentTerms: z.number().int().min(0).max(180).optional(),
});
adminRouter.patch("/shippers/:id", validate(shipperEditSchema), async (req, res, next) => {
  try {
    const [updated] = await db
      .update(shippers)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(shippers.id, req.params.id))
      .returning();
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// ----- Agents: list with KPIs and pay-commission action -----
adminRouter.get("/agents", async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: agents.id,
        userId: agents.userId,
        territory: agents.territory,
        commissionRate: agents.commissionRate,
        loadsCovered: agents.loadsCovered,
        active: agents.active,
        email: users.email,
        contactName: users.contactName,
        companyName: users.companyName,
      })
      .from(agents)
      .leftJoin(users, eq(agents.userId, users.id));

    // Compute earned + unpaid from agentCommissions.
    const earned = await db
      .select({
        agentId: agentCommissions.agentId,
        earned: sql<number>`coalesce(sum(${agentCommissions.commissionAmount}),0)::float`,
        unpaid: sql<number>`coalesce(sum(case when ${agentCommissions.status} = 'paid' then 0 else ${agentCommissions.commissionAmount} end),0)::float`,
      })
      .from(agentCommissions)
      .groupBy(agentCommissions.agentId);

    const earnedMap = new Map(earned.map((e) => [e.agentId, e]));
    const enriched = rows.map((r) => ({
      ...r,
      earned: earnedMap.get(r.id)?.earned ?? 0,
      unpaid: earnedMap.get(r.id)?.unpaid ?? 0,
    }));
    res.json({ ok: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// ----- Push broadcast -----
const broadcastSchema = z.object({
  audience: z.enum(["all_carriers", "all_shippers", "user_email"]),
  email: z.string().email().optional(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().url().optional(),
});
adminRouter.post("/push/broadcast", validate(broadcastSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof broadcastSchema>;
    let userIds: string[] = [];
    if (body.audience === "all_carriers") {
      const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "carrier"));
      userIds = rows.map((r) => r.id);
    } else if (body.audience === "all_shippers") {
      const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, "shipper"));
      userIds = rows.map((r) => r.id);
    } else if (body.audience === "user_email" && body.email) {
      const row = await db.query.users.findFirst({ where: eq(users.email, body.email) });
      if (row) userIds = [row.id];
    }

    let sent = 0;
    for (const uid of userIds) {
      try {
        await notificationService.sendPush(uid, { title: body.title, body: body.body, url: body.url });
        sent += 1;
      } catch (err) {
        console.warn("[push broadcast]", err);
      }
    }
    res.json({ ok: true, data: { audience: body.audience, recipients: userIds.length, sent } });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/audit", async (_req, res) => {
  // No audit table yet — return empty so the frontend renders.
  res.json({ ok: true, data: [] });
});
