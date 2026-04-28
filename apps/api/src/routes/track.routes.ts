import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, loads, trackingEvents, shippers, users } from "@zulla/db";

export const trackRouter: Router = Router();

// Public — accessible by anyone with the trackingLinkToken. Service worker caches
// the response so a shared link still renders the last known state offline.
trackRouter.get("/:token", async (req, res, next) => {
  try {
    const load = await db.query.loads.findFirst({
      where: eq(loads.trackingLinkToken, req.params.token),
    });
    if (!load) {
      return res.status(404).json({ ok: false, error: { message: "Load not found" } });
    }

    const events = await db
      .select()
      .from(trackingEvents)
      .where(eq(trackingEvents.loadId, load.id));
    const shipper = await db.query.shippers.findFirst({ where: eq(shippers.id, load.shipperId) });
    const owner = shipper ? await db.query.users.findFirst({ where: eq(users.id, shipper.userId) }) : null;

    res.json({
      ok: true,
      data: {
        reference: load.referenceNumber,
        status: load.status,
        origin: { city: load.originCity, state: load.originState },
        destination: { city: load.destinationCity, state: load.destinationState },
        pickupDate: load.pickupDate,
        deliveryDate: load.deliveryDate,
        shipperCompany: owner?.companyName ?? shipper?.companyName ?? null,
        events,
      },
    });
  } catch (err) {
    next(err);
  }
});
