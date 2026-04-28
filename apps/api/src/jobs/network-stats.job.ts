import { db, networkStats } from "@zulla/db";
import { computeStats } from "../routes/network.routes.js";

/**
 * Refreshes the cached network_stats row used by the public stats bar. Cheap to
 * run, but expensive enough that we don't want it on every page load.
 */
export async function runNetworkStatsJob() {
  const stats = await computeStats();
  await db.insert(networkStats).values({
    totalCarriers: stats.totalCarriers,
    statesCovered: stats.statesCovered,
    loadsThisMonth: stats.loadsThisMonth,
    onTimeRate: String(stats.onTimeRate),
    pctHighwayVerified: String(stats.pctHighwayVerified),
    avgAuthorityYears: String(stats.avgAuthorityYears),
  });
  console.log("[job] network-stats refreshed", stats);
}
