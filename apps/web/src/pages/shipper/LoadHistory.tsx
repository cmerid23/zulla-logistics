import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LOAD_STATUSES, type Load, type LoadStatus, type PaginatedResult } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";
import { useAuthStore } from "../../stores/auth.store";

export function ShipperLoadHistory() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<LoadStatus | "">("");
  const accessToken = useAuthStore((s) => s.accessToken);

  const loadsQuery = useQuery({
    queryKey: ["shipper", "loads", "all"],
    queryFn: () => api.get<PaginatedResult<Load>>("/loads", { query: { pageSize: 200 } }),
  });

  const items = useMemo(() => {
    const all = loadsQuery.data?.items ?? [];
    return all.filter((l) => {
      if (status && l.status !== status) return false;
      if (from && new Date(l.pickupDate) < new Date(from)) return false;
      if (to && new Date(l.pickupDate) > new Date(to)) return false;
      return true;
    });
  }, [loadsQuery.data, status, from, to]);

  function exportCsv() {
    const url = `/api/v1/shippers/me/loads/export?format=csv`;
    fetch(url, {
      headers: { authorization: `Bearer ${accessToken ?? ""}` },
      credentials: "include",
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "zulla-loads.csv";
        a.click();
      });
  }

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Shipment history</h1>
        <button onClick={exportCsv} className="btn-ghost">Export CSV</button>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label>
            <span className="mono mb-1 block text-[11px] uppercase tracking-wider text-muted">From</span>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <span className="mono mb-1 block text-[11px] uppercase tracking-wider text-muted">To</span>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="mono mb-1 block text-[11px] uppercase tracking-wider text-muted">Status</span>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus((e.target.value as LoadStatus) || "")}
            >
              <option value="">All</option>
              {LOAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["Ref", "Route", "Equipment", "Pickup", "Status", "Amount"].map((h) => (
                  <th key={h} className="px-4 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {items.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 mono text-xs">
                    <Link to={`/shipper/loads/${l.id}`} className="text-accent">
                      {l.referenceNumber ?? l.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {l.originCity}, {l.originState} → {l.destinationCity}, {l.destinationState}
                  </td>
                  <td className="px-4 py-3 mono text-xs">{l.equipmentType}</td>
                  <td className="px-4 py-3 mono text-xs">{formatDate(l.pickupDate)}</td>
                  <td className="px-4 py-3"><Badge tone="info">{l.status.replace("_", " ")}</Badge></td>
                  <td className="px-4 py-3 mono text-green">{formatMoneyDecimal(l.shipperRate)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">No matching loads.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
