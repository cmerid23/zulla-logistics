import { jsPDF } from "jspdf";
import { and, eq } from "drizzle-orm";
import { db, settlements, loads, carriers } from "@zulla/db";
import type { AuthUser, SettlementFactorInput, SettlementGenerateInput } from "@zulla/shared";
import { HttpError } from "../middleware/errorHandler.js";
import { uploadToR2 } from "../lib/r2.js";

async function resolveCarrier(user: AuthUser) {
  const row = await db.query.carriers.findFirst({ where: eq(carriers.userId, user.id) });
  if (!row) throw new HttpError(400, "Carrier profile not found");
  return row;
}

export const settlementService = {
  async list(user: AuthUser) {
    const carrier = await resolveCarrier(user);
    return db
      .select()
      .from(settlements)
      .where(eq(settlements.carrierId, carrier.id));
  },

  /**
   * Generate a settlement record (and PDF) for a delivered load. Idempotent —
   * returns the existing settlement if one is already on file for the load.
   */
  async generate(loadId: string, input: SettlementGenerateInput, user: AuthUser) {
    const carrier = await resolveCarrier(user);

    const load = await db.query.loads.findFirst({
      where: and(eq(loads.id, loadId), eq(loads.carrierId, carrier.id)),
    });
    if (!load) throw new HttpError(404, "Load not found");
    if (!load.carrierRate) throw new HttpError(400, "Load has no carrier rate");

    const existing = await db.query.settlements.findFirst({
      where: eq(settlements.loadId, loadId),
    });
    if (existing) return existing;

    const gross = Number(load.carrierRate);
    const brokerFee = input.brokerFee ? Number(input.brokerFee) : 0;
    const net = gross - brokerFee;

    const pdf = renderSettlementPdf({
      load,
      carrierName: carrier.mcNumber ?? "Carrier",
      gross,
      brokerFee,
      net,
    });
    const r2Key = `settlements/${load.referenceNumber ?? load.id}.pdf`;
    await uploadToR2(r2Key, pdf, "application/pdf");

    const [created] = await db
      .insert(settlements)
      .values({
        loadId: load.id,
        carrierId: carrier.id,
        grossAmount: gross.toFixed(2),
        brokerFee: brokerFee.toFixed(2),
        netAmount: net.toFixed(2),
        pdfR2Key: r2Key,
        status: "generated",
      })
      .returning();
    if (!created) throw new HttpError(500, "Failed to create settlement");
    return created;
  },

  async submitFactoring(id: string, input: SettlementFactorInput, user: AuthUser) {
    const carrier = await resolveCarrier(user);
    const existing = await db.query.settlements.findFirst({
      where: and(eq(settlements.id, id), eq(settlements.carrierId, carrier.id)),
    });
    if (!existing) throw new HttpError(404, "Settlement not found");

    const [updated] = await db
      .update(settlements)
      .set({ status: "factoring_submitted" })
      .where(eq(settlements.id, id))
      .returning();
    // partner + notes are kept on the carrier_payments record once we wire that
    // workflow; for now we log them so they show up in audit/console.
    console.log(`[settlement] ${id} submitted to ${input.partner}`, input.notes ?? "");
    return updated;
  },

  async markPaid(id: string, user: AuthUser) {
    const carrier = await resolveCarrier(user);
    const [updated] = await db
      .update(settlements)
      .set({ status: "paid" })
      .where(and(eq(settlements.id, id), eq(settlements.carrierId, carrier.id)))
      .returning();
    if (!updated) throw new HttpError(404, "Settlement not found");
    return updated;
  },
};

interface SettlementPdfInput {
  load: typeof loads.$inferSelect;
  carrierName: string;
  gross: number;
  brokerFee: number;
  net: number;
}

function renderSettlementPdf({ load, carrierName, gross, brokerFee, net }: SettlementPdfInput): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  doc.setFillColor("#E8FF47");
  doc.rect(0, 0, 612, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Zulla Logistics", 40, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor("#7A7E8A");
  doc.text("Settlement Statement", 40, 84);
  doc.setTextColor("#0A0B0D");

  doc.setFontSize(11);
  doc.text(`Reference ${load.referenceNumber ?? load.id.slice(0, 8)}`, 40, 110);
  doc.text(`Carrier ${carrierName}`, 40, 126);

  let y = 160;
  const row = (k: string, v: string) => {
    doc.text(k, 40, y);
    doc.text(v, 555, y, { align: "right" });
    y += 18;
  };

  doc.setFont("helvetica", "bold");
  doc.text("Load", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  row("Origin", `${load.originCity}, ${load.originState}`);
  row("Destination", `${load.destinationCity}, ${load.destinationState}`);
  row("Distance", load.distanceMiles ? `${load.distanceMiles} mi` : "—");
  row("Equipment", load.equipmentType);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Pay", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  row("Gross", money(gross));
  row("Broker fee", money(brokerFee));
  doc.setDrawColor(220);
  doc.line(40, y, 555, y);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  row("Net to carrier", money(net));

  return Buffer.from(doc.output("arraybuffer"));
}

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
