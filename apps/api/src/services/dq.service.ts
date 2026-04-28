import { and, eq } from "drizzle-orm";
import { db, dqDocuments, drivers, carriers } from "@zulla/db";
import type { AuthUser, DqDocumentRecordInput, DqDocumentType } from "@zulla/shared";
import { DQ_DOCUMENT_TYPES } from "@zulla/shared";
import { HttpError } from "../middleware/errorHandler.js";

async function resolveCarrier(user: AuthUser) {
  const row = await db.query.carriers.findFirst({ where: eq(carriers.userId, user.id) });
  if (!row) throw new HttpError(400, "Carrier profile not found");
  return row;
}

async function resolveDriver(driverId: string, carrierId: string) {
  const row = await db.query.drivers.findFirst({
    where: and(eq(drivers.id, driverId), eq(drivers.carrierId, carrierId)),
  });
  if (!row) throw new HttpError(404, "Driver not found");
  return row;
}

export interface DqStatus {
  driverId: string;
  documents: Array<{
    type: DqDocumentType;
    onFile: boolean;
    expired: boolean;
    expiringSoon: boolean;
    record?: typeof dqDocuments.$inferSelect;
  }>;
  missing: DqDocumentType[];
  expired: DqDocumentType[];
  expiringSoon: DqDocumentType[];
  complete: boolean;
}

export const dqService = {
  /** DQ status for a single driver — used by /carrier/drivers/:id and /carrier/compliance. */
  async status(driverId: string, user: AuthUser): Promise<DqStatus> {
    const carrier = await resolveCarrier(user);
    await resolveDriver(driverId, carrier.id);

    const records = await db
      .select()
      .from(dqDocuments)
      .where(and(eq(dqDocuments.driverId, driverId), eq(dqDocuments.carrierId, carrier.id)));

    const now = Date.now();
    const in30 = now + 30 * 24 * 60 * 60 * 1000;
    const documents = DQ_DOCUMENT_TYPES.map((type) => {
      const record = records.find((r) => r.type === type);
      const exp = record?.expiryDate ? new Date(record.expiryDate).getTime() : null;
      return {
        type,
        onFile: Boolean(record),
        expired: Boolean(record && exp != null && exp < now),
        expiringSoon: Boolean(record && exp != null && exp >= now && exp < in30),
        record,
      };
    });

    return {
      driverId,
      documents,
      missing: documents.filter((d) => !d.onFile).map((d) => d.type),
      expired: documents.filter((d) => d.expired).map((d) => d.type),
      expiringSoon: documents.filter((d) => d.expiringSoon).map((d) => d.type),
      complete: documents.every((d) => d.onFile && !d.expired),
    };
  },

  async record(driverId: string, input: DqDocumentRecordInput, user: AuthUser) {
    const carrier = await resolveCarrier(user);
    await resolveDriver(driverId, carrier.id);

    const [created] = await db
      .insert(dqDocuments)
      .values({
        driverId,
        carrierId: carrier.id,
        type: input.type,
        r2Key: input.r2Key,
        filename: input.filename,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      })
      .returning();
    if (!created) throw new HttpError(500, "Failed to record DQ document");
    return created;
  },
};
