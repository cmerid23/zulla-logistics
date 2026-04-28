import { Router } from "express";
import { stripe } from "../lib/stripe.js";

export const webhooksRouter: Router = Router();

// Stripe sends raw body; index.ts mounts this router with express.raw()
webhooksRouter.post("/stripe", async (req, res) => {
  const sig = req.header("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return res.status(400).send("missing signature");
  }
  try {
    const event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
    // TODO: dispatch to handlers (invoice.paid, charge.failed, etc.)
    console.log("[stripe]", event.type, event.id);
    res.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook]", err);
    res.status(400).send("invalid signature");
  }
});
