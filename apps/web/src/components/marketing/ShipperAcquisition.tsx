import { AnimatedSection } from "./AnimatedSection";

interface Card {
  icon: string;
  title: string;
  body: string;
  mechanic: string;
}

const CARDS: Card[] = [
  { icon: "🧮", title: "Rate Calculator Trojan Horse", body: "Free public lane-rate tool. Email-gated. They come for the calculator, stay for the loadboard.", mechanic: "→ Free tool → Email capture → Drip → Demo" },
  { icon: "🏭", title: "Direct Industry Outreach",     body: "Hand-built lists of mid-size shippers in target verticals. Phone + email + LinkedIn cadence.", mechanic: "→ ICP list → Multichannel → 90-day cycle" },
  { icon: "📊", title: "Shipper Portal Retention",     body: "Dashboard so good they cancel their TMS to use it. Stickier than every Excel ledger combined.", mechanic: "→ KPI cards + invoice queue + tracking" },
  { icon: "🤝", title: "No-Contract Model",            body: "No annual minimums. No platform fees. Pay per booked load, cancel anytime.", mechanic: "→ Per-load fee only" },
  { icon: "🔗", title: "EDI / API Integration",        body: "204/210/214 EDI for enterprise shippers. REST API for everyone else. Two-day onboarding.", mechanic: "→ EDI 204/210/214 + REST" },
  { icon: "📍", title: "City-by-City Seeding",         body: "Saturate one metro before opening the next. Dense local capacity = lowest empty miles.", mechanic: "→ Dallas → Houston → Austin → ATL" },
];

export function ShipperAcquisition() {
  return (
    <section id="shippers" className="bg-deep py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <AnimatedSection>
          <div className="section-label mb-3">Shipper acquisition</div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Six channels. <br className="hidden md:block" />
            One playbook.
          </h2>
        </AnimatedSection>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c, i) => (
            <AnimatedSection key={c.title} delay={i * 0.05}>
              <div className="card flex h-full flex-col p-6 transition-all hover:border-white/[0.14] hover:-translate-y-0.5">
                <div className="text-3xl">{c.icon}</div>
                <h3 className="mt-4 font-display text-lg font-bold">{c.title}</h3>
                <p className="mt-2 flex-1 font-body text-sm text-muted">{c.body}</p>
                <div className="mt-5 mono text-[11px] uppercase tracking-wider text-accent">
                  {c.mechanic}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
