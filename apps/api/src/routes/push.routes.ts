import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users } from "@zulla/db";
import { pushSubscriptionSchema } from "@zulla/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { notificationService } from "../services/notification.service.js";

export const pushRouter: Router = Router();

pushRouter.get("/vapid-public-key", (_req, res) => {
  res.json({ ok: true, data: { key: process.env.VAPID_PUBLIC_KEY ?? null } });
});

pushRouter.use(requireAuth());

pushRouter.post("/subscribe", validate(pushSubscriptionSchema), async (req, res, next) => {
  try {
    await notificationService.savePushSubscription(req.user!.id, req.body);
    res.status(201).json({ ok: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

// DELETE per spec; payload (or query) carries the endpoint.
pushRouter.delete("/subscribe", async (req, res, next) => {
  try {
    const endpoint = (req.body?.endpoint as string | undefined) ?? (req.query.endpoint as string | undefined);
    await notificationService.removePushSubscription(req.user!.id, endpoint);
    res.json({ ok: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

// Backwards-compat alias.
pushRouter.post("/unsubscribe", async (req, res, next) => {
  try {
    await notificationService.removePushSubscription(req.user!.id, req.body?.endpoint);
    res.json({ ok: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

pushRouter.post("/test", async (req, res, next) => {
  try {
    await notificationService.sendTestPush(req.user!.id);
    res.json({ ok: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
});

// Admin-only broadcast — moved here per spec (was at /admin/push/broadcast).
const broadcastSchema = z.object({
  audience: z.enum(["all_carriers", "all_shippers", "user_email"]),
  email: z.string().email().optional(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().url().optional(),
});

pushRouter.post(
  "/broadcast",
  requireAuth(["admin"]),
  validate(broadcastSchema),
  async (req, res, next) => {
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
  },
);
