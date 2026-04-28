import { Router } from "express";
import { z } from "zod";
import { and, eq, sql, gte } from "drizzle-orm";
import {
  db,
  agents,
  loads,
  shippers,
  users,
  agentCommissions,
} from "@zulla/db";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../middleware/errorHandler.js";

export const agentsRouter: Router = Router();

// All routes require authentication; specific RBAC per route below.
agentsRouter.use(requireAuth());

// ----- Agent self-service (req.user is an agent) -----
async function resolveAgentByUser(userId: string) {
  const row = await db.query.agents.findFirst({ where: eq(agents.userId, userId) });
  if (!row) throw new HttpError(404, "Agent profile not found");
  return row;
}

agentsRouter.get("/me", requireAuth(["agent"]), async (req, res, next) => {
  try {
    res.json({ ok: true, data: await resolveAgentByUser(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/me/stats", requireAuth(["agent"]), async (req, res, next) => {
  try {
    const agent = await resolveAgentByUser(req.user!.id);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ thisMonthCommission = 0 } = {}] = await db
      .select({
        thisMonthCommission: sql<number>`coalesce(sum(${agentCommissions.commissionAmount}),0)::float`,
      })
      .from(agentCommissions)
      .where(and(eq(agentCommissions.agentId, agent.id), gte(agentCommissions.paidAt, startOfMonth)));

    const [{ allTimeCommission = 0 } = {}] = await db
      .select({
        allTimeCommission: sql<number>`coalesce(sum(${agentCommissions.commissionAmount}),0)::float`,
      })
      .from(agentCommissions)
      .where(eq(agentCommissions.agentId, agent.id));

    const [{ monthLoads = 0 } = {}] = await db
      .select({ monthLoads: sql<number>`count(*)::int` })
      .from(loads)
      .where(and(eq(loads.agentId, agent.id), gte(loads.createdAt, startOfMonth)));

    const [{ activeLoads = 0 } = {}] = await db
      .select({ activeLoads: sql<number>`count(*)::int` })
      .from(loads)
      .where(and(eq(loads.agentId, agent.id), sql`${loads.status} in ('posted','booked','in_transit')`));

    const [{ avgMargin = 0 } = {}] = await db
      .select({ avgMargin: sql<number>`coalesce(avg(${loads.brokerMargin}),0)::float` })
      .from(loads)
      .where(eq(loads.agentId, agent.id));

    res.json({
      ok: true,
      data: {
        agentId: agent.id,
        territory: agent.territory,
        thisMonthCommission,
        allTimeCommission,
        monthLoads,
        activeLoads,
        avgMargin,
      },
    });
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/me/loads", requireAuth(["agent"]), async (req, res, next) => {
  try {
    const agent = await resolveAgentByUser(req.user!.id);
    const rows = await db
      .select()
      .from(loads)
      .where(eq(loads.agentId, agent.id))
      .orderBy(sql`${loads.createdAt} desc`);
    res.json({ ok: true, data: { items: rows, page: 1, pageSize: rows.length, total: rows.length } });
  } catch (err) {
    next(err);
  }
});

// "Managed shippers" — derived from any shipper this agent has posted a load for,
// since the schema doesn't have an explicit agent_shippers relation. Includes the
// shippers' user.email + a count of loads handled together.
agentsRouter.get("/me/shippers", requireAuth(["agent"]), async (req, res, next) => {
  try {
    const agent = await resolveAgentByUser(req.user!.id);
    const rows = await db
      .select({
        id: shippers.id,
        userId: shippers.userId,
        companyName: shippers.companyName,
        contactName: shippers.contactName,
        phone: shippers.phone,
        billingAddress: shippers.billingAddress,
        paymentTerms: shippers.paymentTerms,
        creditLimit: shippers.creditLimit,
        email: users.email,
        loadCount: sql<number>`(select count(*)::int from ${loads} where ${loads.agentId} = ${agent.id} and ${loads.shipperId} = ${shippers.id})`,
      })
      .from(shippers)
      .leftJoin(users, eq(users.id, shippers.userId))
      .where(sql`exists (select 1 from ${loads} where ${loads.agentId} = ${agent.id} and ${loads.shipperId} = ${shippers.id})`);
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

const newShipperSchema = z.object({
  email: z.string().email(),
  companyName: z.string().min(1).max(256),
  contactName: z.string().min(1).max(256),
  phone: z.string().max(32).optional(),
  billingAddress: z.string().max(500).optional(),
  paymentTerms: z.number().int().min(0).max(180).default(30),
});

agentsRouter.post("/me/shippers", requireAuth(["agent"]), validate(newShipperSchema), async (req, res, next) => {
  try {
    await resolveAgentByUser(req.user!.id);
    const body = req.body as z.infer<typeof newShipperSchema>;

    // Reuse user if it exists; otherwise create a placeholder shipper user.
    let shipperUser = await db.query.users.findFirst({ where: eq(users.email, body.email) });
    if (!shipperUser) {
      const [created] = await db
        .insert(users)
        .values({
          email: body.email,
          passwordHash: "agent-managed-no-login",
          role: "shipper",
          companyName: body.companyName,
          contactName: body.contactName,
          phone: body.phone ?? null,
        })
        .returning();
      shipperUser = created;
    }
    if (!shipperUser) throw new HttpError(500, "Failed to create shipper user");

    const [shipper] = await db
      .insert(shippers)
      .values({
        userId: shipperUser.id,
        companyName: body.companyName,
        contactName: body.contactName,
        phone: body.phone ?? null,
        billingAddress: body.billingAddress ?? null,
        paymentTerms: body.paymentTerms,
      })
      .returning();
    res.status(201).json({ ok: true, data: shipper });
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/me/commissions", requireAuth(["agent"]), async (req, res, next) => {
  try {
    const agent = await resolveAgentByUser(req.user!.id);
    const rows = await db
      .select({
        id: agentCommissions.id,
        loadId: agentCommissions.loadId,
        grossMargin: agentCommissions.grossMargin,
        commissionRate: agentCommissions.commissionRate,
        commissionAmount: agentCommissions.commissionAmount,
        status: agentCommissions.status,
        paidAt: agentCommissions.paidAt,
        loadRef: loads.referenceNumber,
        originCity: loads.originCity,
        originState: loads.originState,
        destinationCity: loads.destinationCity,
        destinationState: loads.destinationState,
        pickupDate: loads.pickupDate,
      })
      .from(agentCommissions)
      .leftJoin(loads, eq(loads.id, agentCommissions.loadId))
      .where(eq(agentCommissions.agentId, agent.id))
      .orderBy(sql`${agentCommissions.paidAt} desc nulls first`);
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/me/commissions/export", requireAuth(["agent"]), async (req, res, next) => {
  try {
    const agent = await resolveAgentByUser(req.user!.id);
    const rows = await db
      .select({
        id: agentCommissions.id,
        loadRef: loads.referenceNumber,
        gross: agentCommissions.grossMargin,
        rate: agentCommissions.commissionRate,
        amount: agentCommissions.commissionAmount,
        status: agentCommissions.status,
        paidAt: agentCommissions.paidAt,
      })
      .from(agentCommissions)
      .leftJoin(loads, eq(loads.id, agentCommissions.loadId))
      .where(eq(agentCommissions.agentId, agent.id));

    const header = ["load_ref", "gross_margin", "commission_rate", "commission_amount", "status", "paid_at"].join(",");
    const csv = rows.map((r) =>
      [
        r.loadRef ?? "",
        r.gross ?? "",
        r.rate ?? "",
        r.amount ?? "",
        r.status ?? "",
        r.paidAt?.toISOString() ?? "",
      ].join(","),
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="zulla-commissions.csv"`);
    res.send([header, ...csv].join("\n"));
  } catch (err) {
    next(err);
  }
});

// ----- Admin pay-commission action -----
const paySchema = z.object({
  amount: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  notes: z.string().max(500).optional(),
});

agentsRouter.post(
  "/:id/pay-commission",
  requireAuth(["admin"]),
  validate(paySchema),
  async (req, res, next) => {
    try {
      const updated = await db
        .update(agentCommissions)
        .set({ status: "paid", paidAt: new Date() })
        .where(and(eq(agentCommissions.agentId, req.params.id), eq(agentCommissions.status, "pending")))
        .returning();

      const totalPaid = updated.reduce((sum, r) => sum + Number(r.commissionAmount), 0);
      res.json({
        ok: true,
        data: { agentId: req.params.id, count: updated.length, totalPaid },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ----- Admin: list agents and dashboard placeholder kept for nav -----
agentsRouter.get("/", requireAuth(["admin", "agent"]), async (_req, res, next) => {
  try {
    const rows = await db.select().from(agents);
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

agentsRouter.get("/dashboard", requireAuth(["agent"]), async (req, res, next) => {
  try {
    const agent = await resolveAgentByUser(req.user!.id);
    res.json({
      ok: true,
      data: {
        agentId: agent.id,
        activeLoads: 0,
        monthCommissionCents: 0,
        pendingQuotes: 0,
      },
    });
  } catch (err) {
    next(err);
  }
});
