import { eq } from "drizzle-orm";
import { db, invoices, loads } from "@zulla/db";
import type { AuthUser } from "@zulla/shared";
import { HttpError } from "../middleware/errorHandler.js";
import { pdfService } from "./pdf.service.js";
import { r2 } from "../lib/r2.js";

function generateInvoiceNumber(): string {
  const d = new Date();
  const yymm = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `INV-${yymm}-${rand}`;
}

export const invoiceService = {
  async list(_user: AuthUser) {
    return db.select().from(invoices);
  },

  async getById(id: string, _user: AuthUser) {
    const row = await db.query.invoices.findFirst({ where: eq(invoices.id, id) });
    if (!row) throw new HttpError(404, "Invoice not found");
    return row;
  },

  async createFromLoad(loadId: string, _user: AuthUser) {
    const load = await db.query.loads.findFirst({ where: eq(loads.id, loadId) });
    if (!load) throw new HttpError(404, "Load not found");
    if (!load.shipperRate) throw new HttpError(400, "Load has no shipper rate");

    const [created] = await db
      .insert(invoices)
      .values({
        loadId: load.id,
        shipperId: load.shipperId,
        invoiceNumber: generateInvoiceNumber(),
        amount: load.shipperRate,
        status: "pending",
      })
      .returning();
    if (!created) throw new HttpError(500, "Failed to create invoice");
    return created;
  },

  async getPdfUrl(id: string, user: AuthUser): Promise<string> {
    const invoice = await this.getById(id, user);
    const pdfBuffer = await pdfService.renderInvoice(invoice);
    const key = invoice.pdfR2Key ?? `invoices/${invoice.invoiceNumber}.pdf`;
    await r2.putObject(key, pdfBuffer, "application/pdf");
    if (!invoice.pdfR2Key) {
      await db.update(invoices).set({ pdfR2Key: key }).where(eq(invoices.id, invoice.id));
    }
    return r2.signedUrl(key);
  },

  async attachPaymentIntent(id: string, paymentIntentId: string) {
    await db
      .update(invoices)
      .set({ stripePaymentIntentId: paymentIntentId })
      .where(eq(invoices.id, id));
  },

  async approve(id: string, user: AuthUser) {
    const invoice = await this.getById(id, user);
    const [updated] = await db
      .update(invoices)
      .set({ status: "approved", issuedAt: new Date() })
      .where(eq(invoices.id, invoice.id))
      .returning();
    return updated;
  },

  async markPaid(id: string, user: AuthUser, stripePaymentIntentId?: string) {
    const invoice = await this.getById(id, user);
    const [updated] = await db
      .update(invoices)
      .set({
        status: "paid",
        paidAt: new Date(),
        stripePaymentIntentId: stripePaymentIntentId ?? invoice.stripePaymentIntentId,
      })
      .where(eq(invoices.id, invoice.id))
      .returning();
    return updated;
  },

  async submitFactoring(id: string, user: AuthUser, partner: string, notes?: string) {
    const invoice = await this.getById(id, user);
    const [updated] = await db
      .update(invoices)
      .set({
        status: "factoring_submitted",
        factoringSubmitted: true,
        factoringPartner: partner,
        factoringNotes: notes ?? null,
      })
      .where(eq(invoices.id, invoice.id))
      .returning();
    return updated;
  },
};
