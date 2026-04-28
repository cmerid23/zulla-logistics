import { AnimatedSection } from "./AnimatedSection";

interface Item {
  bg: string;
  icon: string;
  label: string;
  sub: string;
}

const ITEMS: Item[] = [
  { bg: "bg-green/12 text-green",   icon: "✓", label: "Highway Verified",   sub: "Identity locked" },
  { bg: "bg-blue/12 text-blue",     icon: "📡", label: "FMCSA Real-Time",   sub: "Live SAFER feed" },
  { bg: "bg-accent/12 text-accent", icon: "🔍", label: "SAFER System",      sub: "Authority + insurance" },
  { bg: "bg-green/12 text-green",   icon: "🛡",  label: "Insurance Verified", sub: "BOC-3 on file" },
  { bg: "bg-orange/12 text-orange", icon: "🔐", label: "Secure Rate Cons",  sub: "2FA on every booking" },
];

export function ComplianceBand() {
  return (
    <section className="border-y border-white/[0.07] bg-surface py-8">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <AnimatedSection>
          <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 md:grid-cols-5">
            {ITEMS.map((it) => (
              <div key={it.label} className="flex items-center gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-btn text-lg ${it.bg}`}>
                  {it.icon}
                </div>
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold leading-tight">{it.label}</div>
                  <div className="mono text-[11px] uppercase tracking-wider text-muted">{it.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
