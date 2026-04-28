import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { formatMoneyDecimal } from "../../lib/utils";

interface AdminStats {
  kpis: {
    totalLoads: number;
    grossRevenue: number;
    brokerMargin: number;
    avgMargin: number;
    activeCarriers: number;
    activeShippers: number;
    pendingApplications: number;
  };
  loadsPerDay: Array<{ day: string; count: number }>;
  marginByWeek: Array<{ week: string; margin: number }>;
}

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
  });

  const kpis = data?.kpis;

  return (
    <div className="space-y-6 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Admin overview</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Total loads"        value={String(kpis?.totalLoads ?? "—")} />
        <Kpi label="Gross revenue"      value={formatMoneyDecimal(kpis?.grossRevenue ?? 0)} tone="green" />
        <Kpi label="Broker margin"      value={formatMoneyDecimal(kpis?.brokerMargin ?? 0)} tone="accent" />
        <Kpi label="Avg margin %"       value={kpis ? `${kpis.avgMargin.toFixed(1)}%` : "—"} />
        <Kpi label="Active carriers"    value={String(kpis?.activeCarriers ?? "—")} />
        <Kpi label="Active shippers"    value={String(kpis?.activeShippers ?? "—")} />
        <Kpi label="Pending apps"       value={String(kpis?.pendingApplications ?? "—")} tone={kpis?.pendingApplications ? "orange" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-white/[0.07] flex items-center justify-between">
            <span className="font-display text-base font-bold">Loads per day · last 30 days</span>
            <span className="mono text-[11px] uppercase tracking-wider text-muted">
              {data?.loadsPerDay?.length ?? 0} pts
            </span>
          </CardHeader>
          <CardBody className="h-72">
            {isLoading ? (
              <div className="text-sm text-muted">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.loadsPerDay ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#7A7E8A", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#7A7E8A", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#161820",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: "#7A7E8A" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#E8FF47"
                    strokeWidth={2.5}
                    dot={{ fill: "#E8FF47", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="border-white/[0.07] flex items-center justify-between">
            <span className="font-display text-base font-bold">Margin by week</span>
            <span className="mono text-[11px] uppercase tracking-wider text-muted">last 12 weeks</span>
          </CardHeader>
          <CardBody className="h-72">
            {isLoading ? (
              <div className="text-sm text-muted">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.marginByWeek ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: "#7A7E8A", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#7A7E8A", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "#161820",
                      border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 8,
                    }}
                    labelStyle={{ color: "#7A7E8A" }}
                    formatter={(v: number) => formatMoneyDecimal(v)}
                  />
                  <Bar dataKey="margin" fill="#34D399" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "green" | "accent" | "orange" }) {
  const color =
    tone === "green" ? "text-green" :
    tone === "accent" ? "text-accent" :
    tone === "orange" ? "text-orange" : "text-white";
  return (
    <Card>
      <CardBody>
        <div className="mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
        <div className={`kpi-number mt-1 text-2xl ${color}`}>{value}</div>
      </CardBody>
    </Card>
  );
}
