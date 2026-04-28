import { AnimatedSection } from "./AnimatedSection";

interface Integration {
  name: string;
  category: string;
  dot: "green" | "blue" | "yellow" | "orange" | "red";
}

const INTEGRATIONS: Integration[] = [
  { name: "Highway",        category: "Carrier Identity", dot: "green" },
  { name: "FMCSA SAFER",    category: "Authority",        dot: "blue" },
  { name: "DAT One",        category: "Overflow",         dot: "yellow" },
  { name: "Truckstop",      category: "Overflow",         dot: "yellow" },
  { name: "OTR Solutions",  category: "Factoring",        dot: "green" },
  { name: "RTS Financial",  category: "Factoring",        dot: "blue" },
  { name: "Apex Capital",   category: "Factoring",        dot: "orange" },
  { name: "QuickBooks",     category: "Accounting",       dot: "green" },
  { name: "Motive ELD",     category: "Tracking",         dot: "blue" },
  { name: "Samsara",        category: "Tracking",         dot: "green" },
  { name: "MacroPoint",     category: "Visibility",       dot: "orange" },
  { name: "EDI 204/210/214", category: "Shipper EDI",     dot: "blue" },
  { name: "Stripe",         category: "Payments",         dot: "red" },
  { name: "Twilio",         category: "SMS",              dot: "green" },
];

const DOT_COLOR: Record<Integration["dot"], string> = {
  green: "bg-green",
  blue: "bg-blue",
  yellow: "bg-accent",
  orange: "bg-orange",
  red: "bg-red-400",
};

export function Integrations() {
  return (
    <section className="bg-deep py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <AnimatedSection>
          <div className="section-label mb-3">Integrations</div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Wired into the stack <br className="hidden md:block" />
            you already trust.
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <div className="mt-12 flex flex-wrap gap-2">
            {INTEGRATIONS.map((i) => (
              <div
                key={i.name}
                className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.04] px-4 py-2"
              >
                <span className={`h-2 w-2 rounded-full ${DOT_COLOR[i.dot]}`} />
                <span className="font-body text-sm font-medium">{i.name}</span>
                <span className="mono text-[10px] uppercase tracking-wider text-muted">
                  · {i.category}
                </span>
              </div>
            ))}
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <div className="mt-10 rounded-panel border border-accent/30 bg-accent/[0.06] p-6 md:p-8">
            <div className="mono mb-2 text-[11px] uppercase tracking-wider text-accent">Position</div>
            <p className="font-display text-xl font-bold tracking-tight md:text-2xl">
              DAT as overflow, not dependency. Your private loadboard is your primary capacity source.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
