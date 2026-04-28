import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, shippers, loads, users } from "@zulla/db";
import { requireAuth } from "../middleware/auth.js";

export const shippersRouter: Router = Router();

shippersRouter.use(requireAuth());

shippersRouter.get("/", requireAuth(["admin", "agent"]), async (_req, res, next) => {
  try {
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
        loadCount: sql<number>`(select count(*)::int from ${loads} where ${loads.shipperId} = ${shippers.id})`,
      })
      .from(shippers)
      .leftJoin(users, eq(users.id, shippers.userId));
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

shippersRouter.get("/me", requireAuth(["shipper"]), async (req, res, next) => {
  try {
    const row = await db.query.shippers.findFirst({
      where: eq(shippers.userId, req.user!.id),
    });
    res.json({ ok: true, data: row ?? null });
  } catch (err) {
    next(err);
  }
});

// Shipper self-edit. Limited to fields the shipper should be able to change.
const shipperPatchSchema = z.object({
  contactName: z.string().max(256).optional(),
  phone: z.string().max(32).optional(),
  billingAddress: z.string().max(500).optional(),
});

shippersRouter.patch("/me", requireAuth(["shipper"]), async (req, res, next) => {
  try {
    const parsed = shipperPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: { message: "Invalid payload" } });
    }
    const [updated] = await db
      .update(shippers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(shippers.userId, req.user!.id))
      .returning();
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

shippersRouter.get("/me/loads", requireAuth(["shipper"]), async (req, res, next) => {
  try {
    const shipper = await db.query.shippers.findFirst({
      where: eq(shippers.userId, req.user!.id),
    });
    if (!shipper) return res.json({ ok: true, data: [] });
    const rows = await db.select().from(loads).where(eq(loads.shipperId, shipper.id));
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

shippersRouter.get("/me/loads/export", requireAuth(["shipper"]), async (req, res, next) => {
  try {
    const shipper = await db.query.shippers.findFirst({
      where: eq(shippers.userId, req.user!.id),
    });
    if (!shipper) return res.status(404).send("Shipper profile not found");
    const rows = await db.select().from(loads).where(eq(loads.shipperId, shipper.id));

    const header = [
      "reference_number",
      "status",
      "origin",
      "destination",
      "equipment",
      "pickup_date",
      "delivery_date",
      "miles",
      "shipper_rate",
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
      ].join(","),
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="zulla-loads.csv"`);
    res.send([header, ...csvRows].join("\n"));
  } catch (err) {
    next(err);
  }
});

shippersRouter.get("/:id", async (req, res, next) => {
  try {
    const row = await db.query.shippers.findFirst({ where: eq(shippers.id, req.params.id) });
    res.json({ ok: true, data: row ?? null });
  } catch (err) {
    next(err);
  }
});
