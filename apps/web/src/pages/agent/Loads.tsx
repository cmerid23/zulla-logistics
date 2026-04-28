import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LOAD_STATUSES, type Load, type LoadStatus, type PaginatedResult } from "@zulla/shared";
import { useState } from "react";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

export function AgentLoads() {
  const [statusFilter, setStatusFilter] = useState<LoadStatus | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["agent", "loads"],
    queryFn: () => api.get<PaginatedResult<Load>>("/agents/me/loads"),
  });

  const items = (data?.items ?? []).filter((l) => !statusFilter || l.status === statusFilter);

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">My loads</h1>
        <Link to="/agent/post-load" className="btn-accent">+ Post New Load</Link>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as LoadStatus) || "")}
          >
            <option value="">All statuses</option>
            {LOAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="mono text-[11px] uppercase tracking-wider text-muted self-center md:col-span-2">
            {items.length} loads
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["ID", "Route", "Equipment", "Pickup", "Rate", "Margin", "Status"].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">Loading…</td></tr>
              )}
              {items.map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-3 mono text-xs">{l.referenceNumber ?? l.id.slice(0, 8)}</td>
                  <td className="px-3 py-3">
                    {l.originCity}, {l.originState} → {l.destinationCity}, {l.destinationState}
                  </td>
                  <td className="px-3 py-3 mono text-xs">{l.equipmentType}</td>
                  <td className="px-3 py-3 mono text-xs">{formatDate(l.pickupDate)}</td>
                  <td className="px-3 py-3 mono text-green">{formatMoneyDecimal(l.shipperRate)}</td>
                  <td className="px-3 py-3 mono text-accent">{formatMoneyDecimal(l.brokerMargin)}</td>
                  <td className="px-3 py-3"><Badge tone="info">{l.status.replace("_", " ")}</Badge></td>
                </tr>
              ))}
              {!isLoading && items.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">No matching loads.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
