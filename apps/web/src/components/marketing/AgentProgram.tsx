import { AnimatedSection } from "./AnimatedSection";

interface AgentCard {
  initials: string;
  name: string;
  territory: string;
  loads: string;
  commission: string;
}

const AGENTS: AgentCard[] = [
  { initials: "MT", name: "Marcus Thomas",    territory: "Dallas-Fort Worth metro", loads: "47 loads booked", commission: "$8,420" },
  { initials: "JR", name: "Jen Rios",         territory: "Houston + Gulf Coast",     loads: "62 loads booked", commission: "$11,240" },
  { initials: "DL", name: "Devin Lin",        territory: "South Texas / Laredo",     loads: "38 loads booked", commission: "$6,985" },
];

export function AgentProgram() {
  return (
    <section id="agents" className="bg-black py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-16">
          <AnimatedSection>
            <div className="panel p-6">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                <div className="font-display text-base font-bold">Agent Dashboard</div>
                <div className="flex items-center gap-2 mono text-[11px] uppercase tracking-wider text-green">
                  <span className="h-2 w-2 rounded-full bg-green" />
                  5 agents online
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {AGENTS.map((a) => (
                  <div key={a.initials} className="card flex items-center gap-4 p-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/12 font-display text-base font-bold text-accent">
                      {a.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm font-bold">{a.name}</div>
                      <div className="mono text-[11px] uppercase tracking-wider text-muted">
                        {a.territory}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mono text-xs text-muted">{a.loads}</div>
                      <div className="mono font-medium text-green">{a.commission}</div>
                    </div>
                  </div>
                ))}
                <div className="card flex items-center gap-4 p-4 opacity-60 border-dashed">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-dashed border-white/15 text-muted">
                    +
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-sm font-bold">Your Territory</div>
                    <div className="mono text-[11px] uppercase tracking-wider text-muted">
                      Apply now
                    </div>
                  </div>
                  <button className="btn-ghost btn-sm">Apply</button>
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div>
              <div className="section-label mb-3">Agent program</div>
              <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
                Run your book. <br />
                We handle the back office.
              </h2>
              <p className="mt-5 font-body text-base text-muted">
                Bring your shippers and your relationships. We bring the loadboard, carrier vetting,
                tracking, factoring, and a check that hits the day after delivery.
              </p>
              <p className="mt-3 font-body text-base text-muted">
                Top agents earn 65-70% of the broker margin. No desk fees, no quotas, no
                non-competes.
              </p>

              <div className="panel mt-8 p-5">
                <div className="mono mb-3 text-[11px] uppercase tracking-wider text-muted">
                  Commission breakdown · example
                </div>
                <div className="grid grid-cols-2 gap-y-3 font-body text-sm">
                  <div className="text-muted">Gross broker margin</div>
                  <div className="text-right mono">$315.00</div>
                  <div className="text-green">Agent commission (65%)</div>
                  <div className="text-right money-positive">$204.75</div>
                  <div className="text-accent">Platform override (35%)</div>
                  <div className="text-right mono text-accent">$110.25</div>
                  <div className="col-span-2 my-1 h-px bg-white/[0.07]" />
                  <div className="text-white">Lane example</div>
                  <div className="text-right mono text-white/80">HOU → DAL · $1,150 / $835</div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
