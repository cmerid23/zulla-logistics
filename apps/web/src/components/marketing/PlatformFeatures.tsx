import { AnimatedSection } from "./AnimatedSection";

interface Feature {
  badge: string;
  badgeChip: string;
  title: string;
  body: string;
  bullets: string[];
  span?: boolean;
}

const FEATURES: Feature[] = [
  {
    badge: "Loadboard",
    badgeChip: "chip-green",
    title: "Private Loadboard",
    body: "Your carriers see your loads first. No re-broadcast. No bidding war with 50 brokers.",
    bullets: [
      "Carriers vetted at onboarding — no public spam",
      "HOT pinning + $/mile sort, instantly",
      "Mobile-first booking, swipe to take a load",
    ],
  },
  {
    badge: "Onboarding",
    badgeChip: "chip-blue",
    title: "Carrier Onboarding",
    body: "Six guided steps, FMCSA verified inline, signed in under two hours.",
    bullets: [
      "MC + DOT auto-fetched from SAFER",
      "Insurance + W-9 + agreement uploaded direct to R2",
      "Auto-approve when all green flags clear",
    ],
  },
  {
    badge: "Invoicing",
    badgeChip: "chip-accent",
    title: "Invoicing",
    body: "POD upload triggers an invoice. Stripe collects. QuickBooks reconciles. Done.",
    bullets: [
      "Auto-issue on delivery + POD upload",
      "Approve & pay with Stripe Payment Element",
      "QuickBooks export via API",
    ],
  },
  {
    badge: "Cashflow",
    badgeChip: "chip-orange",
    title: "Factoring",
    body: "OTR Solutions, RTS, Apex — pre-wired. Invoice submission with two clicks.",
    bullets: [
      "One-click submit to your factoring partner",
      "Reserve releases tracked per invoice",
      "Carrier paid in 72 hours, every load",
    ],
  },
  {
    badge: "TMS",
    badgeChip: "chip-green",
    title: "Full Operations TMS",
    body:
      "Tracking, documents, payments, agent commissions, audit log — one system. Built for the modern broker who'd rather grow than babysit Excel.",
    bullets: [
      "Mapbox tracking + GPS pings from the carrier app",
      "Documents in Cloudflare R2 with signed URLs",
      "Agent commission calculator + payout ledger",
      "Stripe + Twilio + Resend webhooks built in",
    ],
    span: true,
  },
];

export function PlatformFeatures() {
  return (
    <section className="bg-black py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <AnimatedSection>
          <div className="section-label mb-3">Platform</div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Everything a broker needs. <br className="hidden md:block" />
            Nothing a carrier hates.
          </h2>
        </AnimatedSection>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <AnimatedSection
              key={f.title}
              delay={i * 0.05}
              className={f.span ? "md:col-span-2" : ""}
            >
              <div className="card h-full p-6 transition-all hover:border-white/[0.14] hover:-translate-y-0.5">
                <div className={`${f.badgeChip} mb-4`}>{f.badge}</div>
                <h3 className="font-display text-2xl font-bold tracking-tight">{f.title}</h3>
                <p className="mt-2 font-body text-base text-muted">{f.body}</p>
                <ul className="mt-5 space-y-2">
                  {f.bullets.map((b) => (
                    <li key={b} className="flex gap-2 font-body text-sm text-white/85">
                      <span className="text-accent" aria-hidden>→</span>
                      <span>{b}</span>
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
