import { and, eq } from "drizzle-orm";
import { db, drivers, carriers } from "@zulla/db";
import type { AuthUser, CreateDriverInput, UpdateDriverInput } from "@zulla/shared";
import { HttpError } from "../middleware/errorHandler.js";

async function resolveCarrier(user: AuthUser) {
  const row = await db.query.carriers.findFirst({ where: eq(carriers.userId, user.id) });
  if (!row) throw new HttpError(400, "Carrier profile not found");
  return row;
}

export const driverService = {
  async list(user: AuthUser) {
    const carrier = await resolveCarrier(user);
    return db.select().from(drivers).where(eq(drivers.carrierId, carrier.id));
  },

  async getById(id: string, user: AuthUser) {
    const carrier = await resolveCarrier(user);
    const row = await db.query.drivers.findFirst({
      where: and(eq(drivers.id, id), eq(drivers.carrierId, carrier.id)),
    });
    if (!row) throw new HttpError(404, "Driver not found");
    return row;
  },

  async create(input: CreateDriverInput, user: AuthUser) {
    const carrier = await resolveCarrier(user);
    const [created] = await db
      .insert(drivers)
      .values({
        carrierId: carrier.id,
        name: input.name,
        cdlNumber: input.cdlNumber ?? null,
        cdlState: input.cdlState ?? null,
        cdlExpiry: input.cdlExpiry ? new Date(input.cdlExpiry) : null,
        medicalCardExpiry: input.medicalCardExpiry ? new Date(input.medicalCardExpiry) : null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        hireDate: input.hireDate ? new Date(input.hireDate) : null,
        status: input.status,
      })
      .returning();
    if (!created) throw new HttpError(500, "Failed to create driver");
    return created;
  },

  async update(id: string, input: UpdateDriverInput, user: AuthUser) {
    const existing = await this.getById(id, user);
    const [updated] = await db
      .update(drivers)
      .set({
        name: input.name ?? existing.name,
        cdlNumber: input.cdlNumber ?? existing.cdlNumber,
        cdlState: input.cdlState ?? existing.cdlState,
        cdlExpiry: input.cdlExpiry ? new Date(input.cdlExpiry) : existing.cdlExpiry,
        medicalCardExpiry: input.medicalCardExpiry
          ? new Date(input.medicalCardExpiry)
          : existing.medicalCardExpiry,
        phone: input.phone ?? existing.phone,
        email: input.email ?? existing.email,
        hireDate: input.hireDate ? new Date(input.hireDate) : existing.hireDate,
        status: input.status ?? existing.status,
      })
      .where(eq(drivers.id, id))
      .returning();
    return updated;
  },
};
