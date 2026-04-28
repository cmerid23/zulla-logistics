import { and, eq, lt } from "drizzle-orm";
import { db, invoices } from "@zulla/db";

export async function runInvoiceReminderJob() {
  const now = new Date();

  // Pending invoices whose dueAt has passed get logged for follow-up. The new
  // schema doesn't have an "overdue" status — we keep them as `pending` and
  // surface them via reporting / email reminders.
  const overdue = await db
    .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, dueAt: invoices.dueAt })
    .from(invoices)
    .where(and(eq(invoices.status, "pending"), lt(invoices.dueAt, now)));

  console.log(`[job] invoice-reminder — ${overdue.length} pending invoices past due`);
  // TODO: send email reminders to billing contact on a configurable cadence.
}
