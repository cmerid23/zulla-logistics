import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface NetworkStats {
  totalCarriers: number;
  statesCovered: number;
  loadsThisMonth: number;
  onTimeRate: string | number;
  pctHighwayVerified: string | number;
  avgAuthorityYears: string | number;
}

function pct(v: string | number): string {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
}
function years(v: string | number): string {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(1)} yr` : "—";
}

export function NetworkStatsBar() {
  const { data } = useQuery({
    queryKey: ["network", "stats"],
    queryFn: () => api.get<NetworkStats>("/network/stats"),
    staleTime: 60 * 60 * 1000,
  });

  const tiles: Array<{ label: string; value: string }> = [
    { label: "Verified carriers",   value: data ? String(data.totalCarriers) : "—" },
    { label: "States covered",      value: data ? String(data.statesCovered) : "—" },
    { label: "Loads this month",    value: data ? String(data.loadsThisMonth) : "—" },
    { label: "On-time delivery",    value: data ? pct(data.onTimeRate) : "—" },
    { label: "Highway-verified",    value: data ? pct(data.pctHighwayVerified) : "—" },
    { label: "Avg authority age",   value: data ? years(data.avgAuthorityYears) : "—" },
  ];

  return (
    <section className="border-y border-white/[0.07] bg-surface py-8">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
          {tiles.map((t) => (
            <div key={t.label}>
              <div className="kpi-number text-2xl text-accent md:text-3xl">{t.value}</div>
              <div className="mono mt-1 text-[11px] uppercase tracking-wider text-muted">
                {t.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
