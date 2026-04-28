import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Invoice, Load, PaginatedResult } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

export function ShipperDashboard() {
  const loadsQuery = useQuery({
    queryKey: ["shipper", "loads"],
    queryFn: () => api.get<PaginatedResult<Load>>("/loads", { query: { pageSize: 100 } }),
  });
  const invoicesQuery = useQuery({
    queryKey: ["shipper", "invoices"],
    queryFn: () => api.get<Invoice[]>("/invoices/me"),
  });

  const items = loadsQuery.data?.items ?? [];
  const invoices = invoicesQuery.data ?? [];
  const now = new Date();

  const active = items.filter((l) => ["posted", "booked", "in_transit"].includes(l.status)).length;
  const monthLoads = items.filter((l) =>
    l.createdAt && new Date(l.createdAt).getMonth() === now.getMonth(),
  ).length;
  const monthSpend = items
    .filter((l) => l.createdAt && new Date(l.createdAt).getMonth() === now.getMonth())
    .reduce((sum, l) => sum + Number(l.shipperRate ?? 0), 0);
  const pendingInvoices = invoices.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-6 px-4 py-5 md:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Dashboard</h1>
        <Link to="/shipper/loads/new" className="btn-accent">+ Post Load</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Active loads" value={String(active)} />
        <Kpi label="Loads this month" value={String(monthLoads)} />
        <Kpi label="Spend this month" value={formatMoneyDecimal(monthSpend)} tone="green" />
        <Kpi label="Pending invoices" value={String(pendingInvoices)} tone={pendingInvoices ? "orange" : undefined} />
      </div>

      <Card>
        <CardHeader className="border-white/[0.07]">
          <div className="flex items-center justify-between">
            <span className="font-display text-base font-bold">Recent loads</span>
            <Link to="/shipper/loads" className="mono text-[11px] uppercase tracking-wider text-accent">
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/[0.07] text-sm">
              <thead className="text-left">
                <tr className="text-muted">
                  {["Ref", "Route", "Pickup", "Status", "Amount"].map((h) => (
                    <th key={h} className="px-2 py-2 mono text-[10px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.slice(0, 10).map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02]">
                    <td className="px-2 py-2 mono text-xs">
                      <Link to={`/shipper/loads/${l.id}`} className="text-accent">
                        {l.referenceNumber ?? l.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-2 py-2">
                      {l.originCity}, {l.originState} → {l.destinationCity}, {l.destinationState}
                    </td>
                    <td className="px-2 py-2 mono text-xs">{formatDate(l.pickupDate)}</td>
                    <td className="px-2 py-2"><Badge tone="info">{l.status.replace("_", " ")}</Badge></td>
                    <td className="px-2 py-2 mono text-green">{formatMoneyDecimal(l.shipperRate)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-muted">No loads yet — post your first.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {pendingInvoices > 0 && (
        <Card>
          <CardHeader className="border-white/[0.07]">
            <span className="font-display text-base font-bold">Pending invoices</span>
          </CardHeader>
          <CardBody className="divide-y divide-white/[0.04]">
            {invoices
              .filter((i) => i.status === "pending")
              .slice(0, 5)
              .map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-display text-sm font-bold">{inv.invoiceNumber}</div>
                    <div className="mono text-[11px] uppercase tracking-wider text-muted">
                      Due {formatDate(inv.dueAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-base font-bold">{formatMoneyDecimal(inv.amount)}</span>
                    <Link to={`/shipper/loads/${inv.loadId}?tab=invoice`} className="btn-accent btn-sm">
                      Approve & Pay
                    </Link>
                  </div>
                </div>
              ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "green" | "orange" }) {
  const color = tone === "green" ? "text-green" : tone === "orange" ? "text-orange" : "text-white";
  return (
    <Card>
      <CardBody>
        <div className="mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
        <div className={`kpi-number mt-1 text-3xl ${color}`}>{value}</div>
      </CardBody>
    </Card>
  );
}
