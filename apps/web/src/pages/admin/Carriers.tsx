import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Carrier } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { CarrierDetailPanel } from "../../components/admin/CarrierDetailPanel";
import { formatDate } from "../../lib/utils";

function isExpiringSoon(date?: string | null): boolean {
  if (!date) return false;
  const ms = new Date(date).getTime() - Date.now();
  return ms < 30 * 24 * 60 * 60 * 1000;
}

export function AdminCarriers() {
  const [selected, setSelected] = useState<Carrier | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "carriers"],
    queryFn: () => api.get<Carrier[]>("/carriers"),
  });

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Carriers</h1>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["MC #", "Equipment", "Highway", "FMCSA", "Insurance expiry", "Onboarding", "DNU", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr><td colSpan={8} className="py-8 text-center text-sm text-muted">Loading…</td></tr>
              )}
              {(data ?? []).map((c) => {
                const expiring = isExpiringSoon(c.insuranceExpiry);
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="cursor-pointer hover:bg-white/[0.02]"
                  >
                    <td className="px-3 py-3 mono text-xs">{c.mcNumber ?? "—"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(c.equipmentTypes ?? []).slice(0, 3).map((e) => <span key={e} className="chip">{e}</span>)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {c.highwayVerified ? <Badge tone="success">Verified</Badge> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-3 mono text-xs">{c.authorityStatus ?? "—"}</td>
                    <td className={`px-3 py-3 mono text-xs ${expiring ? "text-red-400" : ""}`}>
                      {formatDate(c.insuranceExpiry)}
                    </td>
                    <td className="px-3 py-3">
                      {c.onboardingComplete ? (
                        <Badge tone="success">Complete</Badge>
                      ) : (
                        <Badge tone="warning">Step {c.onboardingStep ?? 1}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {c.doNotUse && <Badge tone="danger">DNU</Badge>}
                    </td>
                    <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setSelected(c)} className="btn-ghost btn-sm">Review</button>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && (data ?? []).length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-sm text-muted">No carriers yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <CarrierDetailPanel carrier={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
