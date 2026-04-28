import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";
import { useAuthStore } from "../../stores/auth.store";

interface CommissionRow {
  id: string;
  loadId: string;
  loadRef: string | null;
  originCity: string | null;
  originState: string | null;
  destinationCity: string | null;
  destinationState: string | null;
  pickupDate: string | null;
  grossMargin: string;
  commissionRate: string;
  commissionAmount: string;
  status: "pending" | "processing" | "paid" | "failed";
  paidAt: string | null;
}

export function AgentCommissions() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data, isLoading } = useQuery({
    queryKey: ["agent", "commissions"],
    queryFn: () => api.get<CommissionRow[]>("/agents/me/commissions"),
  });

  const rows = data ?? [];
  const totals = rows.reduce(
    (acc, r) => {
      const amt = Number(r.commissionAmount);
      acc.gross += Number(r.grossMargin);
      acc.amount += amt;
      if (r.status === "paid") acc.paid += amt;
      else acc.unpaid += amt;
      return acc;
    },
    { gross: 0, amount: 0, paid: 0, unpaid: 0 },
  );

  async function exportCsv() {
    const res = await fetch("/api/v1/agents/me/commissions/export", {
      headers: { authorization: `Bearer ${accessToken ?? ""}` },
      credentials: "include",
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "zulla-commissions.csv";
    a.click();
  }

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Commission tracker</h1>
        <button onClick={exportCsv} className="btn-ghost">Export CSV</button>
      </div>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["Load", "Pickup", "Gross margin", "Rate", "Commission", "Status"].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-muted">Loading…</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <div className="font-display font-bold">
                      {r.originCity}, {r.originState} → {r.destinationCity}, {r.destinationState}
                    </div>
                    <div className="mono text-[10px] uppercase tracking-wider text-muted">
                      {r.loadRef ?? r.loadId.slice(0, 8)}
                    </div>
                  </td>
                  <td className="px-3 py-3 mono text-xs">{formatDate(r.pickupDate)}</td>
                  <td className="px-3 py-3 mono">{formatMoneyDecimal(r.grossMargin)}</td>
                  <td className="px-3 py-3 mono text-xs">{(Number(r.commissionRate) * 100).toFixed(0)}%</td>
                  <td className="px-3 py-3 font-display font-bold text-green">
                    {formatMoneyDecimal(r.commissionAmount)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={r.status === "paid" ? "success" : "warning"}>{r.status}</Badge>
                  </td>
                </tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-muted">No commissions yet.</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="border-t border-white/[0.07] bg-white/[0.02]">
                <tr>
                  <td className="px-3 py-3 mono text-[11px] uppercase tracking-wider text-muted" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-3 py-3 mono">{formatMoneyDecimal(totals.gross)}</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 font-display font-bold text-green">
                    {formatMoneyDecimal(totals.amount)}
                  </td>
                  <td className="px-3 py-3 mono text-xs">
                    <span className="text-green">{formatMoneyDecimal(totals.paid)} paid</span>
                    {" · "}
                    <span className="text-orange">{formatMoneyDecimal(totals.unpaid)} unpaid</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
