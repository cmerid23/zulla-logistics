import { and, eq, gte, lt, lte } from "drizzle-orm";
import { db, carriers, users } from "@zulla/db";
import { notificationService } from "../services/notification.service.js";

/**
 * Daily at 08:00 — sweep carriers with insurance_expiry within the next 30
 * days. Notify the broker admin (ADMIN_EMAIL + ADMIN_REVIEW_PHONE) for each
 * record so they can chase a renewal. Carriers already past expiry get an
 * extra "needs immediate review" SMS so they don't slip through.
 */
export async function runInsuranceExpiryJob() {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const adminEmail = process.env.ADMIN_EMAIL ?? process.env.RESEND_FROM ?? null;
  const adminPhone = process.env.ADMIN_REVIEW_PHONE ?? null;

  // Carriers expiring in the next 30 days (inclusive of "already expired").
  const upcoming = await db
    .select({
      carrierId: carriers.id,
      userId: carriers.userId,
      mc: carriers.mcNumber,
      dot: carriers.dotNumber,
      expiry: carriers.insuranceExpiry,
      companyName: users.companyName,
      carrierEmail: users.email,
      contactName: users.contactName,
    })
    .from(carriers)
    .innerJoin(users, eq(carriers.userId, users.id))
    .where(and(gte(carriers.insuranceExpiry, now), lte(carriers.insuranceExpiry, in30)));

  // Carriers whose insurance is already expired — flag for immediate review.
  const expired = await db
    .select({ carrierId: carriers.id, mc: carriers.mcNumber, expiry: carriers.insuranceExpiry })
    .from(carriers)
    .where(lt(carriers.insuranceExpiry, now));

  for (const c of upcoming) {
    const expiryStr = c.expiry?.toISOString().slice(0, 10) ?? "soon";
    const subject = `[Zulla] COI expiring ${expiryStr} — ${c.companyName ?? c.mc ?? c.carrierId}`;
    const html = `<p>Carrier <strong>${c.companyName ?? c.mc ?? c.carrierId}</strong> (MC ${c.mc ?? "—"}) has insurance expiring on <strong>${expiryStr}</strong>.</p><p>Reach out to the carrier (${c.contactName ?? "no contact"} · ${c.carrierEmail ?? "no email"}) to request an updated COI.</p>`;
    const sms = `Zulla: COI expiring ${expiryStr} for MC ${c.mc ?? "?"} (${c.companyName ?? "—"}).`;

    if (adminEmail) {
      await notificationService.sendEmail(adminEmail, subject, html).catch((err) =>
        console.warn("[job] insurance-expiry email failed", err),
      );
    }
    if (adminPhone) {
      await notificationService.sendSms(adminPhone, sms).catch((err) =>
        console.warn("[job] insurance-expiry sms failed", err),
      );
    }
  }

  if (expired.length && adminPhone) {
    await notificationService
      .sendSms(adminPhone, `Zulla: ${expired.length} carrier(s) with EXPIRED COI need immediate review.`)
      .catch((err) => console.warn("[job] insurance-expiry expired sms failed", err));
  }

  console.log(
    `[job] insurance-expiry — ${upcoming.length} expiring in 30d, ${expired.length} already expired`,
  );
}

