import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { MarketingNav } from "../../components/marketing/MarketingNav";
import { Footer } from "../../components/marketing/Footer";
import { NetworkStatsBar } from "../../components/marketing/NetworkStatsBar";
import { formatMoneyDecimal } from "../../lib/utils";

interface LaneRow {
  originCity: string | null;
  originState: string | null;
  destinationCity: string | null;
  destinationState: string | null;
  equipmentType: string | null;
  loadCount: number;
  carrierCount: number;
  avgRate: number;
  miles: number;
  onTimePct: number;
}

export function PublicLanes() {
  const { data, isLoading } = useQuery({
    queryKey: ["public", "lanes"],
    queryFn: () => api.get<LaneRow[]>("/network/lanes"),
  });

  const rows = data ?? [];

  return (
    <div className="min-h-screen bg-black">
      <MarketingNav />
      <main>
        <section className="border-b border-white/[0.07] bg-deep py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <div className="section-label mb-3">Covered lanes</div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
              Texas-anchored. <br className="hidden md:block" />
              48-state capacity.
            </h1>
            <p className="mt-4 max-w-2xl font-body text-base text-muted">
              Live lane data from real loads moved on the Zulla network in the last 30 days.
              Request capacity on any lane and an agent contacts you within 2 hours.
            </p>
          </div>
        </section>

        <NetworkStatsBar />

        <section className="bg-black py-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            {isLoading && <div className="text-sm text-muted">Loading lanes…</div>}
            {!isLoading && rows.length === 0 && (
              <div className="card p-8 text-center text-sm text-muted">
                No lane data yet — check back as we add capacity.
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rows.map((r, i) => (
                <div key={i} className="card flex h-full flex-col p-6 transition hover:border-white/[0.14] hover:-translate-y-0.5">
                  <div className="font-display text-lg font-bold leading-tight">
                    {r.originCity}, {r.originState} → {r.destinationCity}, {r.destinationState}
                  </div>
                  <div className="mt-1 mono text-[11px] uppercase tracking-wider text-muted">
                    {r.equipmentType ?? "—"} · {r.miles ? `${r.miles} mi` : "—"}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Stat label="Loads / mo" value={String(r.loadCount)} />
                    <Stat label="Carriers" value={String(r.carrierCount)} />
                    <Stat label="Avg rate" value={formatMoneyDecimal(r.avgRate)} tone="green" />
                    <Stat label="On-time" value={`${r.onTimePct.toFixed(1)}%`} tone="accent" />
                  </div>

                  <Link
                    to={`/quote?origin_state=${r.originState}&dest_state=${r.destinationState}&equipment=${r.equipmentType ?? ""}`}
                    className="btn-accent mt-6 w-full"
                  >
                    Request capacity
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "accent" }) {
  const color = tone === "green" ? "text-green" : tone === "accent" ? "text-accent" : "text-white";
  return (
    <div className="rounded-btn border border-white/[0.07] bg-deep p-3">
      <div className="mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 font-display text-base font-bold ${color}`}>{value}</div>
    </div>
  );
}
