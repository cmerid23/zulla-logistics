// Server-side PDF generation. Each function builds a branded PDF, uploads it to
// R2, and returns the R2 key. jsPDF works in Node — `output("arraybuffer")` gives
// us bytes we hand straight to `uploadToR2`.

import { jsPDF } from "jspdf";
import { uploadToR2 } from "../lib/r2.js";

const ACCENT = "#E8FF47";
const INK = "#0A0B0D";
const MUTED = "#7A7E8A";

interface LoadLike {
  id: string;
  referenceNumber?: string | null;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  pickupDate?: Date | string | null;
  deliveryDate?: Date | string | null;
  equipmentType: string;
  weightLbs?: number | null;
  commodity?: string | null;
  specialInstructions?: string | null;
  carrierRate?: string | null;
  shipperRate?: string | null;
  distanceMiles?: number | null;
}

interface CarrierLike {
  id: string;
  mcNumber?: string | null;
  dotNumber?: string | null;
}

interface ShipperLike {
  id: string;
  companyName: string;
  contactName?: string | null;
  billingAddress?: string | null;
  paymentTerms?: number | null;
}

interface InvoiceLike {
  id: string;
  invoiceNumber: string;
  amount: string;
  issuedAt?: Date | string | null;
  dueAt?: Date | string | null;
}

// =====================================================================
// Public API — three spec-named generators that upload to R2 and return key.
// =====================================================================

export async function generateRateCon(load: LoadLike, carrier: CarrierLike): Promise<string> {
  const doc = newDoc();
  brandHeader(doc, "Rate Confirmation");
  doc.setFontSize(11);

  const refLine = `Reference ${load.referenceNumber ?? load.id.slice(0, 8)}`;
  doc.text(refLine, 40, 110);

  let y = 140;
  y = section(doc, "Carrier", y);
  y = kv(doc, "MC #", carrier.mcNumber ?? "—", y);
  y = kv(doc, "DOT #", carrier.dotNumber ?? "—", y);

  y += 12;
  y = section(doc, "Lane", y);
  y = kv(doc, "Origin", `${load.originCity}, ${load.originState}`, y);
  y = kv(doc, "Destination", `${load.destinationCity}, ${load.destinationState}`, y);
  y = kv(doc, "Distance", load.distanceMiles ? `${load.distanceMiles} mi` : "—", y);

  y += 12;
  y = section(doc, "Schedule", y);
  y = kv(doc, "Pickup", fmtDate(load.pickupDate), y);
  y = kv(doc, "Delivery", fmtDate(load.deliveryDate), y);

  y += 12;
  y = section(doc, "Freight", y);
  y = kv(doc, "Equipment", load.equipmentType, y);
  y = kv(doc, "Weight", load.weightLbs ? `${load.weightLbs.toLocaleString()} lb` : "—", y);
  y = kv(doc, "Commodity", load.commodity ?? "—", y);

  y += 12;
  y = section(doc, "Pay", y);
  y = kv(doc, "Carrier rate", load.carrierRate ? fmtMoney(load.carrierRate) : "—", y, ACCENT);

  if (load.specialInstructions) {
    y += 12;
    y = section(doc, "Special instructions", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(load.specialInstructions, 40, y, { maxWidth: 510 });
  }

  legalFooter(
    doc,
    "By accepting this rate confirmation, the carrier agrees to the terms of the carrier agreement on file with Zulla Logistics.",
  );

  const buffer = bufferOf(doc);
  const key = `rate-cons/${load.referenceNumber ?? load.id}.pdf`;
  await uploadToR2(key, buffer, "application/pdf");
  return key;
}

export async function generateInvoice(
  load: LoadLike,
  shipper: ShipperLike,
  invoice: InvoiceLike,
): Promise<string> {
  const doc = newDoc();
  brandHeader(doc, `Invoice ${invoice.invoiceNumber}`);
  doc.setFontSize(11);
  doc.text(`Reference ${load.referenceNumber ?? load.id.slice(0, 8)}`, 40, 110);

  let y = 140;
  y = section(doc, "Bill to", y);
  doc.setFont("helvetica", "bold");
  doc.text(shipper.companyName, 40, y); y += 14;
  doc.setFont("helvetica", "normal");
  if (shipper.contactName) { doc.text(shipper.contactName, 40, y); y += 14; }
  if (shipper.billingAddress) {
    shipper.billingAddress.split("\n").forEach((line) => { doc.text(line, 40, y); y += 14; });
  }

  y += 6;
  y = section(doc, "Service", y);
  y = kv(doc, "Lane", `${load.originCity}, ${load.originState} → ${load.destinationCity}, ${load.destinationState}`, y);
  y = kv(doc, "Pickup", fmtDate(load.pickupDate), y);
  y = kv(doc, "Delivery", fmtDate(load.deliveryDate), y);
  y = kv(doc, "Equipment", load.equipmentType, y);

  y += 18;
  y = lineItemHeader(doc, y);
  y = lineItem(doc, `Truckload — ${load.distanceMiles ?? "—"} mi`, invoice.amount, y);

  y += 24;
  doc.setDrawColor(220);
  doc.line(40, y, 555, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Total", 380, y);
  doc.text(fmtMoney(invoice.amount), 555, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  y += 30;
  y = kv(doc, "Issued", fmtDate(invoice.issuedAt), y);
  y = kv(doc, "Due",    fmtDate(invoice.dueAt), y);
  if (shipper.paymentTerms != null) y = kv(doc, "Terms", `Net ${shipper.paymentTerms} days`, y);

  legalFooter(doc, "Pay via the Zulla shipper portal or ACH per remittance instructions.");

  const buffer = bufferOf(doc);
  const key = `invoices/${invoice.invoiceNumber}.pdf`;
  await uploadToR2(key, buffer, "application/pdf");
  return key;
}

export async function generateCarrierAgreement(carrier: CarrierLike): Promise<string> {
  const doc = newDoc();
  brandHeader(doc, "Carrier Agreement");
  doc.setFontSize(10);
  doc.text(`MC ${carrier.mcNumber ?? "—"} · DOT ${carrier.dotNumber ?? "—"}`, 40, 110);

  let y = 140;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. Authority and Insurance", 40, y); y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = paragraph(
    doc,
    "Carrier represents that it holds active operating authority issued by the FMCSA, and maintains commercial auto liability insurance with limits of not less than $1,000,000 and motor truck cargo insurance of not less than $100,000, naming Zulla Logistics, Inc. as a certificate holder.",
    y,
  );

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Re-Brokering Prohibited", 40, y); y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = paragraph(
    doc,
    "Carrier shall not re-broker, co-broker, or otherwise transfer any load tendered by Zulla without prior written consent. Violation results in immediate termination and forfeiture of carrier pay.",
    y,
  );

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Payment Terms", 40, y); y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = paragraph(
    doc,
    "Zulla pays carrier within 72 hours of receipt of a clean POD and signed rate confirmation. Carrier may elect to use an approved factoring partner; ACH details are encrypted at rest with AES-256-GCM.",
    y,
  );

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4. Tracking and Documentation", 40, y); y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = paragraph(
    doc,
    "Carrier agrees to provide GPS check-ins through the Zulla mobile application, upload BOL on pickup and POD on delivery, and respond to status requests within 30 minutes during transit.",
    y,
  );

  y += 24;
  doc.setDrawColor(180);
  doc.line(40, y, 250, y);
  doc.text("Carrier signature", 40, y + 14);
  doc.line(310, y, 520, y);
  doc.text("Date", 310, y + 14);

  legalFooter(doc, "Zulla Logistics, Inc. · MC# 1234567 · DOT# 7654321");

  const buffer = bufferOf(doc);
  const key = `agreements/${carrier.id}.pdf`;
  await uploadToR2(key, buffer, "application/pdf");
  return key;
}

// Backwards-compat for older callers that just want a Buffer.
export const pdfService = {
  generateRateCon,
  generateInvoice,
  generateCarrierAgreement,

  async renderInvoice(invoice: InvoiceLike): Promise<Buffer> {
    const doc = newDoc();
    brandHeader(doc, `Invoice ${invoice.invoiceNumber}`);
    doc.setFontSize(11);
    let y = 140;
    y = kv(doc, "Issued", fmtDate(invoice.issuedAt), y);
    y = kv(doc, "Due",    fmtDate(invoice.dueAt), y);
    y = kv(doc, "Total",  fmtMoney(invoice.amount), y, ACCENT);
    return bufferOf(doc);
  },

  async renderRateConfirmation(load: LoadLike): Promise<Buffer> {
    const doc = newDoc();
    brandHeader(doc, "Rate Confirmation");
    doc.setFontSize(11);
    doc.text(`Reference ${load.referenceNumber ?? load.id.slice(0, 8)}`, 40, 110);
    let y = 140;
    y = kv(doc, "Origin", `${load.originCity}, ${load.originState}`, y);
    y = kv(doc, "Destination", `${load.destinationCity}, ${load.destinationState}`, y);
    y = kv(doc, "Pickup", fmtDate(load.pickupDate), y);
    y = kv(doc, "Equipment", load.equipmentType, y);
    y = kv(doc, "Carrier rate", load.carrierRate ? fmtMoney(load.carrierRate) : "—", y, ACCENT);
    return bufferOf(doc);
  },
};

// =====================================================================
// Shared layout helpers
// =====================================================================

function newDoc(): jsPDF {
  return new jsPDF({ unit: "pt", format: "letter" });
}

function brandHeader(doc: jsPDF, title: string) {
  // Accent bar
  doc.setFillColor(ACCENT);
  doc.rect(0, 0, 612, 6, "F");
  // Wordmark
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Zulla Logistics", 40, 60);
  // Title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(MUTED);
  doc.text(title, 40, 84);
  doc.setTextColor(INK);
}

function section(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(MUTED);
  doc.text(title.toUpperCase(), 40, y);
  doc.setTextColor(INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  return y + 16;
}

function kv(doc: jsPDF, k: string, v: string, y: number, valueColor?: string): number {
  doc.setTextColor(MUTED);
  doc.text(k, 40, y);
  if (valueColor) doc.setTextColor(valueColor);
  else doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.text(v, 200, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(INK);
  return y + 16;
}

function lineItemHeader(doc: jsPDF, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  doc.text("Description", 40, y);
  doc.text("Amount", 555, y, { align: "right" });
  doc.setDrawColor(220);
  doc.line(40, y + 4, 555, y + 4);
  doc.setTextColor(INK);
  doc.setFont("helvetica", "normal");
  return y + 22;
}

function lineItem(doc: jsPDF, label: string, amount: string, y: number): number {
  doc.text(label, 40, y);
  doc.text(fmtMoney(amount), 555, y, { align: "right" });
  return y + 16;
}

function paragraph(doc: jsPDF, text: string, y: number): number {
  doc.text(text, 40, y, { maxWidth: 515 });
  // Approximate line count for advancing y. 12pt leading.
  const lines = doc.splitTextToSize(text, 515).length;
  return y + lines * 12 + 4;
}

function legalFooter(doc: jsPDF, text: string) {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(text, 40, 760, { maxWidth: 515 });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(INK);
}

function fmtDate(v: Date | string | null | undefined): string {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString().slice(0, 10);
}

function fmtMoney(amount: string | number): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function bufferOf(doc: jsPDF): Buffer {
  return Buffer.from(doc.output("arraybuffer"));
}
