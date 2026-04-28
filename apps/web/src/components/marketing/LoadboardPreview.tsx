import { AnimatedSection } from "./AnimatedSection";

interface Row {
  route: string;
  equipment: string;
  weight: string;
  pickup: string;
  miles: string;
  rate: string;
  perMile: string;
  status: "HOT" | "NEW" | "OPEN";
}

const ROWS: Row[] = [
  { route: "Houston, TX → Dallas, TX",        equipment: "Van 53'",  weight: "42,000 lb", pickup: "Tomorrow 08:00", miles: "239",   rate: "$1,150", perMile: "$4.81", status: "HOT" },
  { route: "Laredo, TX → San Antonio, TX",    equipment: "Reefer",   weight: "38,500 lb", pickup: "Tomorrow 14:00", miles: "152",   rate: "$1,420", perMile: "$9.34", status: "HOT" },
  { route: "Fort Worth, TX → El Paso, TX",    equipment: "Flatbed",  weight: "44,000 lb", pickup: "Apr 29",         miles: "590",   rate: "$2,950", perMile: "$5.00", status: "NEW" },
  { route: "Austin, TX → Memphis, TN",        equipment: "Van 53'",  weight: "31,200 lb", pickup: "May 1",          miles: "636",   rate: "$1,860", perMile: "$2.92", status: "OPEN" },
  { route: "Corpus Christi, TX → Atlanta, GA", equipment: "Reefer",  weight: "39,000 lb", pickup: "May 2",          miles: "1,082", rate: "$3,540", perMile: "$3.27", status: "OPEN" },
];

const TABS = ["Available Loads", "My Loads", "Posted Rates"] as const;
const FILTERS = ["All", "Van", "Reefer", "Flatbed", "Power Only"] as const;

const STATUS_CHIP: Record<Row["status"], string> = {
  HOT: "chip-orange",
  NEW: "chip-accent",
  OPEN: "chip-green",
};

export function LoadboardPreview() {
  return (
    <section id="loadboard" className="bg-deep py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <AnimatedSection>
          <div className="section-label mb-3">Live Loadboard</div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            What your carriers see <br className="hidden md:block" />
            the moment you post.
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <div className="card mt-14 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-3">
              <div className="flex gap-1">
                {TABS.map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    className={`mono rounded-btn px-3 py-1.5 text-[11px] uppercase tracking-wider ${
                      i === 0 ? "bg-white/10 text-white" : "text-muted hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex flex-wrap gap-1">
                {FILTERS.map((f, i) => (
                  <span
                    key={f}
                    className={`mono rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider ${
                      i === 0
                        ? "border-accent/40 bg-accent/12 text-accent"
                        : "border-white/[0.07] bg-white/5 text-white/70"
                    }`}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/[0.07] text-sm">
                <thead className="bg-white/[0.02]">
                  <tr className="text-left">
                    <th className="px-4 py-3 mono text-[10px] uppercase tracking-wider text-muted">Route</th>
                    <th className="px-4 py-3 mono text-[10px] uppercase tracking-wider text-muted">Equip</th>
                    <th className="px-4 py-3 mono text-[10px] uppercase tracking-wider text-muted">Weight</th>
                    <th className="px-4 py-3 mono text-[10px] uppercase tracking-wider text-muted">Pickup</th>
                    <th className="px-4 py-3 mono text-[10px] uppercase tracking-wider text-muted">Miles</th>
                    <th className="px-4 py-3 mono text-[10px] uppercase tracking-wider text-muted">Rate</th>
                    <th className="px-4 py-3 mono text-[10px] uppercase tracking-wider text-muted">$/Mi</th>
                    <th className="px-4 py-3 mono text-[10px] uppercase tracking-wider text-muted">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {ROWS.map((r) => (
                    <tr key={r.route} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-body font-medium">{r.route}</td>
                      <td className="px-4 py-3 mono text-xs text-white/80">{r.equipment}</td>
                      <td className="px-4 py-3 mono text-xs text-white/80">{r.weight}</td>
                      <td className="px-4 py-3 mono text-xs text-white/80">{r.pickup}</td>
                      <td className="px-4 py-3 mono text-xs text-white/80">{r.miles}</td>
                      <td className="px-4 py-3"><span className="font-display text-base font-bold text-green">{r.rate}</span></td>
                      <td className="px-4 py-3 mono font-medium text-green">{r.perMile}</td>
                      <td className="px-4 py-3"><span className={STATUS_CHIP[r.status]}>{r.status}</span></td>
                      <td className="px-4 py-3 text-right">
                        <button className="btn-accent btn-sm">Book Now</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
