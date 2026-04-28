import { and, eq } from "drizzle-orm";
import { db, pushSubscriptions, users } from "@zulla/db";
import type { PushSubscriptionInput } from "@zulla/shared";
import { webpush } from "../lib/webpush.js";
import { resend } from "../lib/resend.js";
import { twilio } from "../lib/twilio.js";

// =====================================================================
// Unified notify(userId, type, data) — see spec.
// =====================================================================

export type NotificationType =
  | "carrier_approved"
  | "load_booked"
  | "pickup_reminder"
  | "pod_uploaded"
  | "invoice_sent"
  | "payment_initiated"
  | "payment_confirmed";

export interface NotificationData {
  loadRef?: string;
  origin?: string;
  destination?: string;
  pickupAt?: string;
  amount?: string | number;
  invoiceNumber?: string;
  url?: string;
  message?: string;
  [k: string]: unknown;
}

interface ChannelMix {
  push: boolean;
  sms: boolean;
  email: boolean;
}

// Channel routing table — which transports each notification type uses.
const CHANNELS: Record<NotificationType, ChannelMix> = {
  carrier_approved:  { push: true,  sms: true,  email: true  },
  load_booked:       { push: true,  sms: true,  email: true  },
  pickup_reminder:   { push: true,  sms: true,  email: false },
  pod_uploaded:      { push: true,  sms: false, email: true  },
  invoice_sent:      { push: false, sms: false, email: true  },
  payment_initiated: { push: true,  sms: true,  email: true  },
  payment_confirmed: { push: true,  sms: false, email: true  },
};

interface BuiltMessage {
  title: string;
  body: string;
  emailSubject: string;
  emailHtml: string;
  smsBody: string;
  url?: string;
}

function buildMessage(type: NotificationType, data: NotificationData): BuiltMessage {
  const ref = data.loadRef ? ` (${data.loadRef})` : "";
  const lane = data.origin && data.destination ? ` ${data.origin} → ${data.destination}` : "";
  const url = data.url;
  const money = data.amount != null ? formatMoney(data.amount) : undefined;

  switch (type) {
    case "carrier_approved":
      return {
        title: "You're approved on Zulla",
        body: "Your carrier account is verified — start finding loads.",
        emailSubject: "You're verified — start finding loads",
        emailHtml: "<p>Your Zulla carrier account is approved. Sign in to view available loads.</p>",
        smsBody: "Zulla: your carrier account is approved. Open the loadboard to start booking.",
        url,
      };
    case "load_booked":
      return {
        title: "Load booked",
        body: `Booked${lane}${ref}.`,
        emailSubject: `Load booked${ref}`,
        emailHtml: `<p>The load${lane}${ref} has been booked. Rate confirmation has been sent.</p>`,
        smsBody: `Zulla: load booked${lane}${ref}.`,
        url,
      };
    case "pickup_reminder":
      return {
        title: "Pickup reminder",
        body: `Pickup${lane}${ref} ${data.pickupAt ?? "soon"}.`,
        emailSubject: `Pickup reminder${ref}`,
        emailHtml: `<p>Reminder: pickup${lane}${ref} ${data.pickupAt ?? "soon"}.</p>`,
        smsBody: `Zulla: pickup${lane}${ref} ${data.pickupAt ?? "soon"}.`,
        url,
      };
    case "pod_uploaded":
      return {
        title: "POD received",
        body: `POD uploaded${ref}. Invoice generating.`,
        emailSubject: `POD received${ref}`,
        emailHtml: `<p>POD received${ref}. Your invoice is being prepared.</p>`,
        smsBody: `Zulla: POD received${ref}.`,
        url,
      };
    case "invoice_sent":
      return {
        title: "Invoice sent",
        body: `Invoice ${data.invoiceNumber ?? ""} ${money ? "for " + money : ""}.`,
        emailSubject: `Invoice ${data.invoiceNumber ?? ""}`,
        emailHtml: `<p>Invoice ${data.invoiceNumber ?? ""} ${money ? "for " + money : ""} is ready in your portal.</p>`,
        smsBody: `Zulla: invoice ${data.invoiceNumber ?? ""} ready.`,
        url,
      };
    case "payment_initiated":
      return {
        title: "Payment initiated",
        body: `Payment ${money ? "of " + money : ""} initiated${ref}.`,
        emailSubject: `Payment initiated${ref}`,
        emailHtml: `<p>Payment ${money ? "of " + money : ""} initiated${ref}. Funds typically arrive within 72 hours.</p>`,
        smsBody: `Zulla: payment ${money ? "of " + money : ""} initiated${ref}.`,
        url,
      };
    case "payment_confirmed":
      return {
        title: "Payment confirmed",
        body: `Payment ${money ?? ""} confirmed${ref}.`,
        emailSubject: `Payment confirmed${ref}`,
        emailHtml: `<p>Payment ${money ?? ""} confirmed${ref}. Thank you.</p>`,
        smsBody: `Zulla: payment ${money ?? ""} confirmed${ref}.`,
        url,
      };
  }
}

function formatMoney(amount: string | number): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

/**
 * Unified notification dispatcher. Routes to push + sms + email based on type.
 * Best-effort — failures in one transport do not block the others.
 */
async function notify(
  userId: string,
  type: NotificationType,
  data: NotificationData = {},
): Promise<{ push: boolean; sms: boolean; email: boolean }> {
  const result = { push: false, sms: false, email: false };
  const mix = CHANNELS[type];
  const message = buildMessage(type, data);

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return result;

  if (mix.push) {
    try {
      await sendPush(userId, { title: message.title, body: message.body, url: message.url });
      result.push = true;
    } catch (err) {
      console.warn("[notify] push failed", err);
    }
  }
  if (mix.sms && user.phone) {
    try {
      await twilio.sendSms(user.phone, message.smsBody);
      result.sms = true;
    } catch (err) {
      console.warn("[notify] sms failed", err);
    }
  }
  if (mix.email) {
    try {
      await resend.send({ to: user.email, subject: message.emailSubject, html: message.emailHtml });
      result.email = true;
    } catch (err) {
      console.warn("[notify] email failed", err);
    }
  }
  return result;
}

// =====================================================================
// Lower-level helpers (kept stable for existing callers).
// =====================================================================

async function savePushSubscription(userId: string, sub: PushSubscriptionInput) {
  const existing = await db.query.pushSubscriptions.findFirst({
    where: and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, sub.endpoint)),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .returning();
  return created;
}

async function removePushSubscription(userId: string, endpoint?: string) {
  if (!endpoint) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    return;
  }
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
}

async function sendTestPush(userId: string) {
  return sendPush(userId, { title: "Zulla", body: "Push notifications enabled." });
}

async function sendPush(userId: string, payload: { title: string; body: string; url?: string }) {
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  await Promise.all(
    subs.map((s) =>
      webpush.send(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      ),
    ),
  );
}

async function sendEmail(to: string, subject: string, body: string) {
  return resend.send({ to, subject, html: body });
}

async function sendSms(to: string, body: string) {
  return twilio.sendSms(to, body);
}

export const notificationService = {
  notify,
  savePushSubscription,
  removePushSubscription,
  sendTestPush,
  sendPush,
  sendEmail,
  sendSms,
};
