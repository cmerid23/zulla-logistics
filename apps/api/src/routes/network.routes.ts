import { Router } from "express";
import { sql, desc, and, gte } from "drizzle-orm";
import { db, carriers, loads, networkStats } from "@zulla/db";

export const networkRouter: Router = Router();

// Public — aggregate-only, no carrier PII.
networkRouter.get("/coverage", async (_req, res, next) => {
  try {
    // Carrier density per state (origin states they serve based on actual loads).
    const stateRows = await db
      .select({
        state: loads.originState,
        carrierCount: sql<number>`count(distinct ${loads.carrierId})::int`,
      })
      .from(loads)
      .where(sql`${loads.carrierId} is not null and ${loads.originState} is not null`)
      .groupBy(loads.originState);

    const stateCarrierCounts: Record<string, number> = {};
    for (const r of stateRows) if (r.state) stateCarrierCounts[r.state] = r.carrierCount;

    // Active lanes — origin/dest pairs with at least one load.
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const laneRows = await db
      .select({
        originState: loads.originState,
        destState: loads.destinationState,
        loadCount: sql<number>`count(*)::int`,
        carrierCount: sql<number>`count(distinct ${loads.carrierId})::int`,
      })
      .from(loads)
      .where(gte(loads.createdAt, since30))
      .groupBy(loads.originState, loads.destinationState)
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(40);

    // Equipment by state.
    const eqRows = await db
      .select({
        state: loads.originState,
        equipment: loads.equipmentType,
        cnt: sql<number>`count(distinct ${loads.carrierId})::int`,
      })
      .from(loads)
      .where(sql`${loads.carrierId} is not null and ${loads.originState} is not null`)
      .groupBy(loads.originState, loads.equipmentType);

    const equipmentByState: Record<string, Record<string, number>> = {};
    for (const r of eqRows) {
      if (!r.state) continue;
      const bucket = (equipmentByState[r.state] ??= {});
      bucket[r.equipment ?? "other"] = (bucket[r.equipment ?? "other"] ?? 0) + r.cnt;
    }

    res.json({
      ok: true,
      data: {
        stateCarrierCounts,
        activeLanes: laneRows.map((r) => ({
          origin_state: r.originState,
          dest_state: r.destState,
          load_count: r.loadCount,
          carrier_count: r.carrierCount,
        })),
        equipmentByState,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Public — live stats bar pulled from the cached network_stats row.
networkRouter.get("/stats", async (_req, res, next) => {
  try {
    const [latest] = await db
      .select()
      .from(networkStats)
      .orderBy(desc(networkStats.calculatedAt))
      .limit(1);
    if (latest) {
      return res.json({ ok: true, data: latest });
    }

    // Fallback — compute on the fly the first time.
    const stats = await computeStats();
    res.json({ ok: true, data: { ...stats, calculatedAt: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
});

export async function computeStats() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ totalCarriers = 0 } = {}] = await db
    .select({ totalCarriers: sql<number>`count(*)::int` })
    .from(carriers);

  const [{ pctHighway = 0 } = {}] = await db
    .select({
      pctHighway: sql<number>`coalesce(avg(case when ${carriers.highwayVerified} then 100 else 0 end),0)::float`,
    })
    .from(carriers);

  const [{ statesCovered = 0 } = {}] = await db
    .select({
      statesCovered: sql<number>`count(distinct ${loads.originState})::int`,
    })
    .from(loads);

  const [{ loadsThisMonth = 0 } = {}] = await db
    .select({ loadsThisMonth: sql<number>`count(*)::int` })
    .from(loads)
    .where(gte(loads.createdAt, startOfMonth));

  const [{ onTimePct = 0 } = {}] = await db
    .select({
      onTimePct: sql<number>`coalesce(avg(case when ${loads.deliveryDate} is null or ${loads.deliveryDate} >= ${loads.pickupDate} then 100 else 0 end),0)::float`,
    })
    .from(loads);

  const [{ avgAuthority = 0 } = {}] = await db
    .select({
      avgAuthority: sql<number>`coalesce(avg(extract(year from age(now(), ${carriers.authoritySince}))),0)::float`,
    })
    .from(carriers)
    .where(sql`${carriers.authoritySince} is not null`);

  return {
    totalCarriers,
    statesCovered,
    loadsThisMonth,
    onTimeRate: onTimePct.toFixed(2),
    pctHighwayVerified: pctHighway.toFixed(2),
    avgAuthorityYears: avgAuthority.toFixed(2),
  };
}

// Lanes page — top featured lanes with rollups computed from real loads.
networkRouter.get("/lanes", async (_req, res, next) => {
  try {
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const rows = await db
      .select({
        originCity: loads.originCity,
        originState: loads.originState,
        destinationCity: loads.destinationCity,
        destinationState: loads.destinationState,
        equipmentType: loads.equipmentType,
        loadCount: sql<number>`count(*)::int`,
        carrierCount: sql<number>`count(distinct ${loads.carrierId})::int`,
        avgRate: sql<number>`coalesce(avg(${loads.shipperRate}),0)::float`,
        miles: sql<number>`coalesce(avg(${loads.distanceMiles}),0)::int`,
        onTimePct: sql<number>`coalesce(avg(case when ${loads.deliveryDate} is null or ${loads.deliveryDate} >= ${loads.pickupDate} then 100 else 0 end),0)::float`,
      })
      .from(loads)
      .where(gte(loads.createdAt, since30))
      .groupBy(
        loads.originCity,
        loads.originState,
        loads.destinationCity,
        loads.destinationState,
        loads.equipmentType,
      )
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(24);

    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});
