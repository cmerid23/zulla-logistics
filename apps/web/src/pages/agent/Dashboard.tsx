import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { formatMoneyDecimal } from "../../lib/utils";

interface AgentStats {
  agentId: string;
  territory: string | null;
  thisMonthCommission: number;
  allTimeCommission: number;
  monthLoads: number;
  activeLoads: number;
  avgMargin: number;
}

export function AgentDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["agent", "stats"],
    queryFn: () => api.get<AgentStats>("/agents/me/stats"),
  });

  return (
    <div className="space-y-6 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Agent dashboard</h1>
          {data?.territory && (
            <span className="chip-accent mt-2 inline-flex">
              📍 {data.territory}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Link to="/agent/loads" className="btn-ghost btn-sm">My loads</Link>
          <Link to="/agent/shippers" className="btn-accent btn-sm">+ Post for shipper</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Commission this month" value={formatMoneyDecimal(data?.thisMonthCommission ?? 0)} tone="green" big />
        <Kpi label="All-time commission"  value={formatMoneyDecimal(data?.allTimeCommission ?? 0)} />
        <Kpi label="Loads this month"     value={String(data?.monthLoads ?? "—")} />
        <Kpi label="Active loads"         value={String(data?.activeLoads ?? "—")} />
        <Kpi label="Avg margin / load"    value={formatMoneyDecimal(data?.avgMargin ?? 0)} tone="accent" />
      </div>

      <Card>
        <CardHeader className="border-white/[0.07]">
          <span className="font-display text-base font-bold">Quick links</span>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Link to="/agent/loads" className="card p-4 transition hover:border-white/[0.14]">
            <div className="font-display text-base font-bold">📦 My loads</div>
            <div className="mt-1 mono text-[11px] uppercase tracking-wider text-muted">Manage shipments and post new</div>
          </Link>
          <Link to="/agent/shippers" className="card p-4 transition hover:border-white/[0.14]">
            <div className="font-display text-base font-bold">🤝 My shippers</div>
            <div className="mt-1 mono text-[11px] uppercase tracking-wider text-muted">Manage your book of business</div>
          </Link>
          <Link to="/agent/commissions" className="card p-4 transition hover:border-white/[0.14]">
            <div className="font-display text-base font-bold">💰 Commissions</div>
            <div className="mt-1 mono text-[11px] uppercase tracking-wider text-muted">Tracker · paid + unpaid</div>
          </Link>
        </CardBody>
      </Card>

      {isLoading && <div className="text-sm text-muted">Loading…</div>}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone?: "green" | "accent";
  big?: boolean;
}) {
  const color = tone === "green" ? "text-green" : tone === "accent" ? "text-accent" : "text-white";
  return (
    <Card>
      <CardBody>
        <div className="mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
        <div className={`kpi-number mt-1 ${big ? "text-3xl" : "text-2xl"} ${color}`}>{value}</div>
      </CardBody>
    </Card>
  );
}
