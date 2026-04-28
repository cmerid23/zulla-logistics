import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LOAD_STATUSES, type Load, type LoadStatus, type PaginatedResult } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { LoadDetailPanel } from "../../components/admin/LoadDetailPanel";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";
import { useAuthStore } from "../../stores/auth.store";

export function AdminLoads() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [statusFilter, setStatusFilter] = useState<LoadStatus | "">("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Load | null>(null);

  const loadsQuery = useQuery({
    queryKey: ["admin", "loads", statusFilter, search],
    queryFn: () =>
      api.get<PaginatedResult<Load>>("/loads", {
        query: {
          status: statusFilter || undefined,
          search: search || undefined,
          pageSize: 200,
        },
      }),
  });

  const items = useMemo(() => loadsQuery.data?.items ?? [], [loadsQuery.data]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i) => i.id)));
  }

  async function exportSelected() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const res = await fetch("/api/v1/admin/loads/bulk-export", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken ?? ""}`,
      },
      credentials: "include",
      body: JSON.stringify({ ids }),
    });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "zulla-loads-export.csv";
    a.click();
  }

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Loads</h1>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button onClick={exportSelected} className="btn-accent btn-sm">
              Export Selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="input"
            placeholder="Search ref / commodity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value as LoadStatus) || "")}
          >
            <option value="">All statuses</option>
            {LOAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="mono text-[11px] uppercase tracking-wider text-muted self-center">
            {items.length} loads · {selectedIds.size} selected
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={selectedIds.size > 0 && selectedIds.size === items.length}
                    onChange={toggleAll}
                  />
                </th>
                {["ID", "Route", "Equipment", "Shipper", "Carrier", "Pickup", "Rate", "Margin", "Status"].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {items.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setDetail(l)}
                  className="cursor-pointer hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(l.id)}
                      onChange={() => toggle(l.id)}
                    />
                  </td>
                  <td className="px-3 py-3 mono text-xs">{l.referenceNumber ?? l.id.slice(0, 8)}</td>
                  <td className="px-3 py-3">
                    {l.originCity}, {l.originState} → {l.destinationCity}, {l.destinationState}
                  </td>
                  <td className="px-3 py-3 mono text-xs">{l.equipmentType}</td>
                  <td className="px-3 py-3 mono text-xs">{l.shipperId.slice(0, 8)}</td>
                  <td className="px-3 py-3 mono text-xs">
                    {l.carrierId ? l.carrierId.slice(0, 8) : <span className="text-muted">Unassigned</span>}
                  </td>
                  <td className="px-3 py-3 mono text-xs">{formatDate(l.pickupDate)}</td>
                  <td className="px-3 py-3 mono text-green">{formatMoneyDecimal(l.shipperRate)}</td>
                  <td className="px-3 py-3 mono text-accent">{formatMoneyDecimal(l.brokerMargin)}</td>
                  <td className="px-3 py-3"><Badge tone="info">{l.status.replace("_", " ")}</Badge></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={10} className="py-8 text-center text-sm text-muted">No matching loads.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <LoadDetailPanel load={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
