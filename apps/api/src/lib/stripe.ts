import Stripe from "stripe";

// Stripe v12+ throws synchronously when constructed with an empty key. We let the
// app boot without one and fail loudly at the first `stripe.*` call instead.
const key = process.env.STRIPE_SECRET_KEY ?? "";

function build(): Stripe {
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, { apiVersion: "2024-06-20", typescript: true });
}

let _client: Stripe | null = null;
function client(): Stripe {
  if (!_client) _client = build();
  return _client;
}

// Proxy that lazily delegates every property/method to the real client. Keeps
// existing `stripe.paymentIntents.create(...)` / `stripe.webhooks.constructEvent`
// call sites working without changes.
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop: string | symbol) {
    return Reflect.get(client(), prop);
  },
});
