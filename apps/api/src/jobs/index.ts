import cron from "node-cron";
import { runInsuranceExpiryJob } from "./insurance-expiry.job.js";
import { runInvoiceReminderJob } from "./invoice-reminder.job.js";
import { runNetworkStatsJob } from "./network-stats.job.js";

export function startCronJobs() {
  // Daily 08:00 — insurance expiry sweep (spec).
  cron.schedule("0 8 * * *", () => {
    runInsuranceExpiryJob().catch((err) => console.error("[job] insurance-expiry", err));
  });

  // Every 4 hours — overdue invoice reminders
  cron.schedule("0 */4 * * *", () => {
    runInvoiceReminderJob().catch((err) => console.error("[job] invoice-reminder", err));
  });

  // Daily 03:00 — refresh cached network stats for the public stats bar.
  cron.schedule("0 3 * * *", () => {
    runNetworkStatsJob().catch((err) => console.error("[job] network-stats", err));
  });

  console.log("[jobs] cron schedules registered");
}
