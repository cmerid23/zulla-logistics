import { eq } from "drizzle-orm";
import { db, trucks, carriers } from "@zulla/db";
import type { AuthUser, CreateTruckInput } from "@zulla/shared";
import { HttpError } from "../middleware/errorHandler.js";

async function resolveCarrier(user: AuthUser) {
  const row = await db.query.carriers.findFirst({ where: eq(carriers.userId, user.id) });
  if (!row) throw new HttpError(400, "Carrier profile not found");
  return row;
}

export const truckService = {
  async list(user: AuthUser) {
    const carrier = await resolveCarrier(user);
    return db.select().from(trucks).where(eq(trucks.carrierId, carrier.id));
  },

  async create(input: CreateTruckInput, user: AuthUser) {
    const carrier = await resolveCarrier(user);
    const [created] = await db
      .insert(trucks)
      .values({
        carrierId: carrier.id,
        unitNumber: input.unitNumber ?? null,
        vin: input.vin ?? null,
        plate: input.plate ?? null,
        plateState: input.plateState ?? null,
        year: input.year ?? null,
        make: input.make ?? null,
        model: input.model ?? null,
        type: input.type ?? null,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        registrationExpiry: input.registrationExpiry ? new Date(input.registrationExpiry) : null,
      })
      .returning();
    if (!created) throw new HttpError(500, "Failed to create truck");
    return created;
  },
};
