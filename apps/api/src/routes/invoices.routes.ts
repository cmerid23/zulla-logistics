import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, invoices, shippers } from "@zulla/db";
import { requireAuth } from "../middleware/auth.js";
import { invoiceService } from "../services/invoice.service.js";
import { stripe } from "../lib/stripe.js";

export const invoicesRouter: Router = Router();

invoicesRouter.use(requireAuth());

// Admin: all invoices.
invoicesRouter.get("/", requireAuth(["admin", "agent"]), async (req, res, next) => {
  try {
    const data = await invoiceService.list(req.user!);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// Shipper: only their invoices.
invoicesRouter.get("/me", requireAuth(["shipper"]), async (req, res, next) => {
  try {
    const shipper = await db.query.shippers.findFirst({
      where: eq(shippers.userId, req.user!.id),
    });
    if (!shipper) return res.json({ ok: true, data: [] });
    const rows = await db.select().from(invoices).where(eq(invoices.shipperId, shipper.id));
    res.json({ ok: true, data: rows });
  } catch (err) {
    next(err);
  }
});

invoicesRouter.get("/:id", async (req, res, next) => {
  try {
    const invoice = await invoiceService.getById(req.params.id, req.user!);
    res.json({ ok: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

invoicesRouter.post("/from-load/:loadId", async (req, res, next) => {
  try {
    const invoice = await invoiceService.createFromLoad(req.params.loadId, req.user!);
    res.status(201).json({ ok: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

invoicesRouter.get("/:id/pdf", async (req, res, next) => {
  try {
    const url = await invoiceService.getPdfUrl(req.params.id, req.user!);
    res.json({ ok: true, data: { url } });
  } catch (err) {
    next(err);
  }
});

// Shipper Stripe payment — create a PaymentIntent for the invoice amount and
// return its clientSecret so the Payment Element on the web can confirm.
invoicesRouter.post("/:id/pay", requireAuth(["shipper"]), async (req, res, next) => {
  try {
    const invoice = await invoiceService.getById(req.params.id, req.user!);
    if (invoice.status === "paid") {
      return res.status(409).json({ ok: false, error: { message: "Invoice already paid" } });
    }
    const amountCents = Math.round(Number(invoice.amount) * 100);
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    });
    await invoiceService.attachPaymentIntent(invoice.id, intent.id);
    res.json({
      ok: true,
      data: {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount: invoice.amount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Admin: submit to factoring.
invoicesRouter.post("/:id/factoring", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const invoice = await invoiceService.submitFactoring(
      req.params.id,
      req.user!,
      req.body?.partner ?? "",
      req.body?.notes,
    );
    res.json({ ok: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// Admin: manual mark paid.
invoicesRouter.patch("/:id/paid", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const invoice = await invoiceService.markPaid(
      req.params.id,
      req.user!,
      req.body?.stripePaymentIntentId,
    );
    res.json({ ok: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// Admin: approve an invoice (issued state).
invoicesRouter.post("/:id/approve", requireAuth(["admin"]), async (req, res, next) => {
  try {
    const invoice = await invoiceService.approve(req.params.id, req.user!);
    res.json({ ok: true, data: invoice });
  } catch (err) {
    next(err);
  }
});
