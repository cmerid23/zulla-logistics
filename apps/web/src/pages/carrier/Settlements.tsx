import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Settlement } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

const FACTORING_PARTNERS = ["OTR Solutions", "RTS Financial", "Apex Capital"] as const;

export function CarrierSettlements() {
  const qc = useQueryClient();
  const [factorTarget, setFactorTarget] = useState<Settlement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["settlements"],
    queryFn: () => api.get<Settlement[]>("/settlements"),
  });

  async function downloadPdf(id: string) {
    const { url } = await api.get<{ url: string }>(`/settlements/${id}/pdf`);
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Settlements</h1>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["Date", "Load", "Gross", "Broker fee", "Net", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">Loading…</td></tr>
              )}
              {(data ?? []).map((s) => (
                <tr key={s.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-3 mono text-xs">{formatDate(s.createdAt)}</td>
                  <td className="px-3 py-3 mono text-xs">{s.loadId.slice(0, 8)}</td>
                  <td className="px-3 py-3 mono">{formatMoneyDecimal(s.grossAmount)}</td>
                  <td className="px-3 py-3 mono text-orange">{formatMoneyDecimal(s.brokerFee)}</td>
                  <td className="px-3 py-3 font-display font-bold text-green">{formatMoneyDecimal(s.netAmount)}</td>
                  <td className="px-3 py-3">
                    <Badge tone={s.status === "paid" ? "success" : s.status === "factoring_submitted" ? "info" : "warning"}>
                      {s.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {s.pdfR2Key && (
                        <button onClick={() => downloadPdf(s.id)} className="btn-ghost btn-sm">PDF</button>
                      )}
                      {s.status === "generated" && (
                        <button onClick={() => setFactorTarget(s)} className="btn-orange btn-sm">Factor</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && (data ?? []).length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">No settlements yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <FactorModal
        target={factorTarget}
        onClose={() => setFactorTarget(null)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["settlements"] })}
      />
    </div>
  );
}

function FactorModal({
  target,
  onClose,
  onSuccess,
}: {
  target: Settlement | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [partner, setPartner] = useState<string>(FACTORING_PARTNERS[0]);
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: () => api.post(`/settlements/${target!.id}/factor`, { partner, notes }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title="Submit to factoring"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => submit.mutate()} disabled={submit.isPending} className="btn-accent">
            {submit.isPending ? "Submitting…" : "Submit"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block mono text-[11px] uppercase tracking-wider text-muted">Partner</span>
          <select className="input" value={partner} onChange={(e) => setPartner(e.target.value)}>
            {FACTORING_PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block mono text-[11px] uppercase tracking-wider text-muted">Notes</span>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}
