import { Link } from "react-router-dom";
import { AnimatedSection } from "./AnimatedSection";

interface Plan {
  who: string;
  name: string;
  price: string;
  note: string;
  cta: string;
  ctaHref: string;
  featured?: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    who: "For carriers",
    name: "Carriers",
    price: "$0/mo",
    note: "Always free. Forever.",
    cta: "Apply to Carry",
    ctaHref: "/carrier/join",
    features: [
      "Free private loadboard",
      "72-hour payment, every load",
      "Highway-verified identity",
      "Mobile booking + GPS tracking",
      "BOL / POD upload from the cab",
      "Optional factoring partners pre-wired",
    ],
  },
  {
    who: "For shippers",
    name: "Shippers",
    price: "$0/mo",
    note: "+ per-load booking fee",
    cta: "Post Your First Load",
    ctaHref: "/register",
    featured: true,
    features: [
      "AI rate suggestions on every load",
      "Real-time tracking + signed POD",
      "Stripe-collected invoicing",
      "EDI 204/210/214 + REST API",
      "Pay only when freight moves",
      "No annual minimums or platform fees",
    ],
  },
  {
    who: "For agents",
    name: "Agents",
    price: "60-70%",
    note: "of the broker margin",
    cta: "Become an Agent",
    ctaHref: "/agents/apply",
    features: [
      "65% commission base, 70% at $50k/mo",
      "Bring your book; keep your relationships",
      "Our loadboard, vetting, factoring, ops",
      "Daily commission reports",
      "Auto-payout on Friday",
      "No desk fees, no quotas, no non-competes",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-black py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <AnimatedSection>
          <div className="section-label mb-3">Pricing</div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Pricing without the asterisk.
          </h2>
        </AnimatedSection>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((p, i) => (
            <AnimatedSection key={p.name} delay={i * 0.06}>
              <div
                className={`relative h-full p-7 ${
                  p.featured
                    ? "rounded-panel border-2 border-accent/40 bg-gradient-to-b from-accent/[0.07] to-transparent shadow-glow"
                    : "card"
                }`}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 mono text-[10px] uppercase tracking-wider text-black">
                    Most popular
                  </div>
                )}
                <div className="mono text-[11px] uppercase tracking-wider text-muted">{p.who}</div>
                <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight">{p.name}</h3>
                <div className="mt-4">
                  <div className="kpi-number text-5xl text-white">{p.price}</div>
                  <div className="mt-1 mono text-[11px] uppercase tracking-wider text-muted">
                    {p.note}
                  </div>
                </div>
                <Link
                  to={p.ctaHref}
                  className={`${p.featured ? "btn-accent" : "btn-ghost"} mt-6 w-full`}
                >
                  {p.cta}
                </Link>
                <div className="my-6 h-px bg-white/[0.07]" />
                <ul className="space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 font-body text-sm text-white/85">
                      <span className="text-green" aria-hidden>✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
