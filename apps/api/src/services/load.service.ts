import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import {
  db,
  loads,
  shippers,
  carriers,
  rateConfirmations,
  trackingEvents,
  invoices,
  users,
} from "@zulla/db";
import type {
  AuthUser,
  CreateLoadInput,
  Load,
  LoadFilters,
  UpdateLoadInput,
} from "@zulla/shared";
import { HttpError } from "../middleware/errorHandler.js";
import { pdfService } from "./pdf.service.js";
import { r2 } from "../lib/r2.js";
import { resend } from "../lib/resend.js";

function generateRef(): string {
  const d = new Date();
  const yymmdd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `ZL-${yymmdd}-${rand}`;
}

function generateInvoiceNumber(): string {
  const d = new Date();
  const yymm = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `INV-${yymm}-${rand}`;
}

function sixDigitCode(): string {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

function computeMargin(shipperRate?: string | null, carrierRate?: string | null) {
  if (!shipperRate || !carrierRate) return { brokerMargin: null, brokerMarginPct: null };
  const s = Number(shipperRate);
  const c = Number(carrierRate);
  if (!Number.isFinite(s) || !Number.isFinite(c) || s <= 0) {
    return { brokerMargin: null, brokerMarginPct: null };
  }
  const margin = s - c;
  return {
    brokerMargin: margin.toFixed(2),
    brokerMarginPct: ((margin / s) * 100).toFixed(2),
  };
}

export const loadService = {
  async list(filters: LoadFilters, _user: AuthUser) {
    const conditions: Array<SQL | undefined> = [
      filters.status ? eq(loads.status, filters.status) : undefined,
      filters.equipmentType ? eq(loads.equipmentType, filters.equipmentType) : undefined,
      filters.originState ? eq(loads.originState, filters.originState) : undefined,
      filters.destinationState ? eq(loads.destinationState, filters.destinationState) : undefined,
      filters.shipperId ? eq(loads.shipperId, filters.shipperId) : undefined,
      filters.carrierId ? eq(loads.carrierId, filters.carrierId) : undefined,
      filters.agentId ? eq(loads.agentId, filters.agentId) : undefined,
      filters.pickupAfter ? gte(loads.pickupDate, new Date(filters.pickupAfter)) : undefined,
      filters.pickupBefore ? lte(loads.pickupDate, new Date(filters.pickupBefore)) : undefined,
      filters.search
        ? or(
            ilike(loads.referenceNumber, `%${filters.search}%`),
            ilike(loads.commodity, `%${filters.search}%`),
          )
        : undefined,
    ];
    const active = conditions.filter((c): c is SQL => c !== undefined);
    const where = active.length ? and(...active) : undefined;

    const offset = (filters.page - 1) * filters.pageSize;
    const items = await db
      .select()
      .from(loads)
      .where(where)
      .orderBy(desc(loads.createdAt))
      .limit(filters.pageSize)
      .offset(offset);

    const [{ total } = { total: 0 }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(loads)
      .where(where);

    return { items, page: filters.page, pageSize: filters.pageSize, total };
  },

  async getById(id: string, _user: AuthUser): Promise<Load> {
    const row = await db.query.loads.findFirst({ where: eq(loads.id, id) });
    if (!row) throw new HttpError(404, "Load not found");
    return row as unknown as Load;
  },

  async create(input: CreateLoadInput, user: AuthUser): Promise<Load> {
    let shipperId = input.shipperId;
    if (!shipperId && user.role === "shipper") {
      const shipper = await db.query.shippers.findFirst({
        where: eq(shippers.userId, user.id),
      });
      if (!shipper) throw new HttpError(400, "Shipper profile not found");
      shipperId = shipper.id;
    }
    if (!shipperId) throw new HttpError(400, "shipperId is required");

    const referenceNumber = input.referenceNumber ?? generateRef();
    const margin = computeMargin(input.shipperRate, input.carrierRate);

    const [created] = await db
      .insert(loads)
      .values({
        shipperId,
        agentId: input.agentId ?? null,
        originCity: input.originCity,
        originState: input.originState,
        destinationCity: input.destinationCity,
        destinationState: input.destinationState,
        pickupDate: new Date(input.pickupDate),
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
        equipmentType: input.equipmentType,
        weightLbs: input.weightLbs ?? null,
        commodity: input.commodity ?? null,
        specialInstructions: input.specialInstructions ?? null,
        referenceNumber,
        distanceMiles: input.distanceMiles ?? null,
        shipperRate: input.shipperRate ?? null,
        carrierRate: input.carrierRate ?? null,
        brokerMargin: margin.brokerMargin,
        brokerMarginPct: margin.brokerMarginPct,
        internalNotes: input.internalNotes ?? null,
        status: "posted",
      })
      .returning();

    if (!created) throw new HttpError(500, "Failed to create load");
    return created as unknown as Load;
  },

  async update(id: string, input: UpdateLoadInput, _user: AuthUser): Promise<Load> {
    const existing = await db.query.loads.findFirst({ where: eq(loads.id, id) });
    if (!existing) throw new HttpError(404, "Load not found");

    const shipperRate = input.shipperRate ?? existing.shipperRate ?? null;
    const carrierRate = input.carrierRate ?? existing.carrierRate ?? null;
    const margin = computeMargin(shipperRate, carrierRate);

    const [updated] = await db
      .update(loads)
      .set({
        ...input,
        pickupDate: input.pickupDate ? new Date(input.pickupDate) : undefined,
        deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : undefined,
        brokerMargin: margin.brokerMargin,
        brokerMarginPct: margin.brokerMarginPct,
        updatedAt: new Date(),
      })
      .where(eq(loads.id, id))
      .returning();
    if (!updated) throw new HttpError(404, "Load not found");
    return updated as unknown as Load;
  },

  /**
   * Carrier books a posted load. Generates a rate confirmation PDF, stores it on
   * R2, creates a `rate_confirmations` row with a 6-digit verification code, and
   * emails the carrier the PDF + code. Final activation happens in `verifyRateCon`.
   */
  async book(id: string, user: AuthUser) {
    if (user.role !== "carrier") throw new HttpError(403, "Only carriers can book loads");
    const carrier = await db.query.carriers.findFirst({ where: eq(carriers.userId, user.id) });
    if (!carrier) throw new HttpError(400, "Carrier profile not found");
    if (!carrier.onboardingComplete) {
      throw new HttpError(403, "Finish onboarding before booking loads");
    }
    if (carrier.doNotUse) throw new HttpError(403, "Account suspended");

    const load = await db.query.loads.findFirst({ where: eq(loads.id, id) });
    if (!load) throw new HttpError(404, "Load not found");
    if (load.status !== "posted") throw new HttpError(409, "Load is no longer available");

    const [updatedLoad] = await db
      .update(loads)
      .set({ carrierId: carrier.id, status: "booked", updatedAt: new Date() })
      .where(eq(loads.id, id))
      .returning();

    const code = sixDigitCode();
    const pdfBuffer = await pdfService.renderRateConfirmation(updatedLoad as never);
    const r2Key = `rate-cons/${updatedLoad.referenceNumber ?? updatedLoad.id}.pdf`;
    await r2.putObject(r2Key, pdfBuffer, "application/pdf");

    await db.insert(rateConfirmations).values({
      loadId: updatedLoad.id,
      carrierId: carrier.id,
      twoFaCode: code,
      pdfR2Key: r2Key,
    });

    resend
      .send({
        to: user.email,
        subject: `Rate confirmation — ${updatedLoad.referenceNumber}`,
        html: `<p>Your rate confirmation is attached. Verification code: <strong>${code}</strong></p>`,
      })
      .catch((err) => console.warn("[load] rate con email failed", err));

    return { load: updatedLoad as unknown as Load, codeRequired: true };
  },

  async verifyRateCon(loadId: string, code: string, user: AuthUser) {
    const carrier = await db.query.carriers.findFirst({ where: eq(carriers.userId, user.id) });
    if (!carrier) throw new HttpError(400, "Carrier profile not found");

    const rc = await db.query.rateConfirmations.findFirst({
      where: and(eq(rateConfirmations.loadId, loadId), eq(rateConfirmations.carrierId, carrier.id)),
    });
    if (!rc) throw new HttpError(404, "Rate confirmation not found");
    if (rc.twoFaCode !== code) throw new HttpError(400, "Invalid code");

    await db
      .update(rateConfirmations)
      .set({ twoFaVerified: true, acceptedAt: new Date() })
      .where(eq(rateConfirmations.id, rc.id));

    return { verified: true };
  },

  /**
   * Carrier moves the load through the timeline. `delivered` auto-creates an
   * invoice and emails the shipper.
   */
  async updateStatus(loadId: string, status: "in_transit" | "delivered", user: AuthUser) {
    const carrier = await db.query.carriers.findFirst({ where: eq(carriers.userId, user.id) });
    if (!carrier) throw new HttpError(400, "Carrier profile not found");

    const load = await db.query.loads.findFirst({ where: eq(loads.id, loadId) });
    if (!load) throw new HttpError(404, "Load not found");
    if (load.carrierId !== carrier.id) throw new HttpError(403, "Not your load");

    const [updated] = await db
      .update(loads)
      .set({ status, updatedAt: new Date() })
      .where(eq(loads.id, loadId))
      .returning();

    if (status === "delivered") {
      await this.createInvoiceForLoad(updated);
    }

    return updated as unknown as Load;
  },

  async recordTracking(
    loadId: string,
    payload: { latitude: number; longitude: number; statusUpdate?: string },
    user: AuthUser,
  ) {
    const carrier = await db.query.carriers.findFirst({ where: eq(carriers.userId, user.id) });
    if (!carrier) throw new HttpError(400, "Carrier profile not found");
    const load = await db.query.loads.findFirst({ where: eq(loads.id, loadId) });
    if (!load || load.carrierId !== carrier.id) throw new HttpError(403, "Not your load");

    const [event] = await db
      .insert(trackingEvents)
      .values({
        loadId,
        latitude: payload.latitude.toString(),
        longitude: payload.longitude.toString(),
        statusUpdate: payload.statusUpdate ?? null,
        source: "carrier_app",
      })
      .returning();
    return event;
  },

  async cancel(id: string, _user: AuthUser): Promise<Load> {
    const [updated] = await db
      .update(loads)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(loads.id, id))
      .returning();
    if (!updated) throw new HttpError(404, "Load not found");
    return updated as unknown as Load;
  },

  async createInvoiceForLoad(load: typeof loads.$inferSelect) {
    if (!load.shipperRate) return null;

    const existing = await db.query.invoices.findFirst({
      where: eq(invoices.loadId, load.id),
    });
    if (existing) return existing;

    const [invoice] = await db
      .insert(invoices)
      .values({
        loadId: load.id,
        shipperId: load.shipperId,
        invoiceNumber: generateInvoiceNumber(),
        amount: load.shipperRate,
        status: "pending",
        issuedAt: new Date(),
      })
      .returning();
    if (!invoice) return null;

    // Mark the load as invoiced.
    await db.update(loads).set({ status: "invoiced" }).where(eq(loads.id, load.id));

    // Email shipper.
    const shipper = await db.query.shippers.findFirst({ where: eq(shippers.id, load.shipperId) });
    if (shipper) {
      const owner = await db.query.users.findFirst({ where: eq(users.id, shipper.userId) });
      if (owner?.email) {
        resend
          .send({
            to: owner.email,
            subject: `Invoice ${invoice.invoiceNumber} ready — ${load.referenceNumber ?? ""}`,
            html: `<p>Your shipment delivered. Invoice ${invoice.invoiceNumber} for $${load.shipperRate} is ready in your portal.</p>`,
          })
          .catch((err) => console.warn("[load] invoice email failed", err));
      }
    }

    return invoice;
  },
};
