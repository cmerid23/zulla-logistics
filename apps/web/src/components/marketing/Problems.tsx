import { AnimatedSection } from "./AnimatedSection";

interface Problem {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  fix: string;
}

const PROBLEMS: Problem[] = [
  {
    iconBg: "bg-red-500/12 text-red-400",
    icon: <span aria-hidden>🛡</span>,
    title: "Double-Brokering",
    body: "Phantom carriers re-broker your load. Cargo disappears. Insurance fights the claim.",
    fix: "→ Highway Identity Lock",
  },
  {
    iconBg: "bg-orange/12 text-orange",
    icon: <span aria-hidden>⏱</span>,
    title: "Slow Pay",
    body: "Net-30 is fiction. Carriers wait 45-60 days while paying drivers and fuel weekly.",
    fix: "→ 72-hour payment, every load",
  },
  {
    iconBg: "bg-blue/12 text-blue",
    icon: <span aria-hidden>🪙</span>,
    title: "DAT Dependency",
    body: "Carrier paying $149/mo to see the same load every other broker is bidding on.",
    fix: "→ Free private loadboard",
  },
  {
    iconBg: "bg-accent/12 text-accent",
    icon: <span aria-hidden>📋</span>,
    title: "Manual Onboarding",
    body: "PDFs, faxes, 2-week packets. Half your applicants drop off before W-9 returns.",
    fix: "→ 2-hour digital flow",
  },
  {
    iconBg: "bg-green/12 text-green",
    icon: <span aria-hidden>👁</span>,
    title: "Rate Opacity",
    body: "Shippers don't know their margin. Carriers don't know yours. Trust evaporates.",
    fix: "→ Transparency dashboard",
  },
  {
    iconBg: "bg-orange/12 text-orange",
    icon: <span aria-hidden>🗂</span>,
    title: "Back-Office Chaos",
    body: "QuickBooks, spreadsheets, email threads. Reconcile by hand every Friday.",
    fix: "→ Unified invoicing",
  },
];

export function Problems() {
  return (
    <section id="platform" className="bg-deep py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <AnimatedSection>
          <div className="section-label mb-3">The mess we&apos;re cleaning up</div>
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Brokerage is broken. <br className="hidden md:block" />
            Here&apos;s what we fixed.
          </h2>
        </AnimatedSection>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map((p, i) => (
            <AnimatedSection key={p.title} delay={i * 0.05}>
              <div className="card h-full p-6 transition-all hover:border-white/[0.14] hover:-translate-y-0.5">
                <div className={`grid h-12 w-12 place-items-center rounded-xl text-2xl ${p.iconBg}`}>
                  {p.icon}
                </div>
                <h3 className="mt-5 font-display text-lg font-bold">{p.title}</h3>
                <p className="mt-2 font-body text-sm text-muted">{p.body}</p>
                <div className="chip-orange mt-5">{p.fix}</div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
