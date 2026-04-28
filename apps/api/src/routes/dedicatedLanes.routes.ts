import { Router } from "express";
import { z } from "zod";
import { jsPDF } from "jspdf";
import { and, eq } from "drizzle-orm";
import { db, dedicatedLanes, shippers } from "@zulla/db";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadToR2, getPresignedDownloadUrl } from "../lib/r2.js";
import { HttpError } from "../middleware/errorHandler.js";

export const dedicatedLanesRouter: Router = Router();

dedicatedLanesRouter.use(requireAuth());

async function resolveShipper(userId: string) {
  const row = await db.query.shippers.findFirst({ where: eq(shippers.userId, userId) });
  if (!row) throw new HttpError(400, "Shipper profile not found");
  return row;
}

const requestSchema = z.object({
  originState: z.string().length(2),
  destState: z.string().length(2),
  equipmentType: z.string().min(1),
  weeklyVolume: z.number().int().positive(),
  durationDays: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  maxRate: z.string().regex(/^\d+(\.\d+)?$/),
});

// Shipper requests a new dedicated lane.
dedicatedLanesRouter.post(
  "/",
  requireAuth(["shipper"]),
  validate(requestSchema),
  async (req, res, next) => {
    try {
      const shipper = await resolveShipper(req.user!.id);
      const body = req.body as z.infer<typeof requestSchema>;
      const start = new Date();
      const end = new Date(start.getTime() + body.durationDays * 24 * 60 * 60 * 1000);

      const [created] = await db
        .insert(dedicatedLanes)
        .values({
          shipperId: shipper.id,
          originState: body.originState,
          destState: body.destState,
          equipmentType: body.equipmentType,
          weeklyVolume: body.weeklyVolume,
          lockedRate: body.maxRate,
          startDate: start,
          endDate: end,
          status: "requested",
        })
        .returning();
      res.status(201).json({ ok: true, data: created });
    } catch (err) {
      next(err);
    }
  },
);

// Shipper sees their own lanes.
dedicatedLanesRouter.get("/me", requireAuth(["shipper"]), async (req, res, next) => {
  try {
    const shipper = await resolveShipper(req.user!.id);
    const rows = await db
      .select()
      .from(dedicatedLanes)
      .where(eq(dedicatedLanes.shipperId, shipper.id));
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// Admin: list all + approve.
dedicatedLanesRouter.get("/", requireAuth(["admin", "agent"]), async (_req, res, next) => {
  try {
    res.json({ ok: true, data: await db.select().from(dedicatedLanes) });
  } catch (err) {
    next(err);
  }
});

const approveSchema = z.object({
  carrierRate: z.string().regex(/^\d+(\.\d+)?$/),
});

dedicatedLanesRouter.post(
  "/:id/approve",
  requireAuth(["admin"]),
  validate(approveSchema),
  async (req, res, next) => {
    try {
      const lane = await db.query.dedicatedLanes.findFirst({
        where: eq(dedicatedLanes.id, req.params.id),
      });
      if (!lane) throw new HttpError(404, "Lane not found");

      const shipper = await db.query.shippers.findFirst({
        where: eq(shippers.id, lane.shipperId),
      });

      const pdf = renderAgreement(lane, shipper?.companyName ?? "Shipper", req.body.carrierRate);
      const r2Key = `dedicated-lanes/${lane.id}.pdf`;
      await uploadToR2(r2Key, pdf, "application/pdf");

      const [updated] = await db
        .update(dedicatedLanes)
        .set({
          status: "approved",
          carrierRate: req.body.carrierRate,
          agreementPdfR2Key: r2Key,
        })
        .where(eq(dedicatedLanes.id, lane.id))
        .returning();
      res.json({ ok: true, data: updated });
    } catch (err) {
      next(err);
    }
  },
);

// Shipper signs.
dedicatedLanesRouter.post("/:id/sign", requireAuth(["shipper"]), async (req, res, next) => {
  try {
    const shipper = await resolveShipper(req.user!.id);
    const [updated] = await db
      .update(dedicatedLanes)
      .set({ status: "active", signedByShipperAt: new Date() })
      .where(and(eq(dedicatedLanes.id, req.params.id), eq(dedicatedLanes.shipperId, shipper.id)))
      .returning();
    if (!updated) throw new HttpError(404, "Lane not found");
    res.json({ ok: true, data: updated });
  } catch (err) {
    next(err);
  }
});

dedicatedLanesRouter.get("/:id/agreement", async (req, res, next) => {
  try {
    const lane = await db.query.dedicatedLanes.findFirst({
      where: eq(dedicatedLanes.id, req.params.id),
    });
    if (!lane?.agreementPdfR2Key) {
      return res.status(404).json({ ok: false, error: { message: "Agreement not generated yet" } });
    }
    const url = await getPresignedDownloadUrl(lane.agreementPdfR2Key);
    res.json({ ok: true, data: { url } });
  } catch (err) {
    next(err);
  }
});

function renderAgreement(
  lane: typeof dedicatedLanes.$inferSelect,
  shipperName: string,
  carrierRate: string,
): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  doc.setFillColor("#E8FF47");
  doc.rect(0, 0, 612, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Zulla Logistics", 40, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor("#7A7E8A");
  doc.text("Dedicated Lane Agreement", 40, 84);
  doc.setTextColor("#0A0B0D");

  let y = 130;
  doc.setFontSize(11);
  const row = (k: string, v: string) => {
    doc.text(k, 40, y);
    doc.text(v, 555, y, { align: "right" });
    y += 18;
  };

  row("Shipper", shipperName);
  row("Lane", `${lane.originState} → ${lane.destState}`);
  row("Equipment", lane.equipmentType);
  row("Weekly volume", `${lane.weeklyVolume ?? 0} loads`);
  row("Locked shipper rate", `$${Number(lane.lockedRate ?? 0).toFixed(2)}`);
  row("Carrier rate", `$${Number(carrierRate).toFixed(2)}`);
  row("Start", lane.startDate?.toISOString().slice(0, 10) ?? "—");
  row("End",   lane.endDate?.toISOString().slice(0, 10) ?? "—");

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.text("Terms", 40, y); y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const terms =
    "Zulla guarantees capacity for the weekly volume above at the locked rate. Shipper agrees to tender at least the weekly volume; underutilization does not refund. Either party may terminate with 14 days written notice. Detention beyond 2 hours billed at $75/hr.";
  doc.text(terms, 40, y, { maxWidth: 510 });
  y += 64;

  doc.setDrawColor(180);
  doc.line(40, y, 250, y);
  doc.text("Shipper signature", 40, y + 14);
  doc.line(310, y, 520, y);
  doc.text("Date", 310, y + 14);

  return Buffer.from(doc.output("arraybuffer"));
}
