import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { formatMoneyDecimal } from "../../lib/utils";

interface AdminAgent {
  id: string;
  userId: string;
  territory: string | null;
  commissionRate: string | null;
  loadsCovered: number | null;
  active: boolean | null;
  email: string | null;
  contactName: string | null;
  companyName: string | null;
  earned: number;
  unpaid: number;
}

export function AdminAgents() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "agents"],
    queryFn: () => api.get<AdminAgent[]>("/admin/agents"),
  });
  const [target, setTarget] = useState<AdminAgent | null>(null);

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Agents</h1>
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["Agent", "Territory", "Loads covered", "Earned", "Unpaid", "Action"].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-muted">Loading…</td></tr>
              )}
              {(data ?? []).map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <div className="font-display font-bold">{a.contactName ?? a.email ?? "—"}</div>
                    <div className="mono text-[10px] uppercase tracking-wider text-muted">{a.email}</div>
                  </td>
                  <td className="px-3 py-3 mono text-xs">{a.territory ?? "—"}</td>
                  <td className="px-3 py-3 mono text-xs">{a.loadsCovered ?? 0}</td>
                  <td className="px-3 py-3 mono text-green">{formatMoneyDecimal(a.earned)}</td>
                  <td className={`px-3 py-3 mono ${a.unpaid > 0 ? "text-orange" : "text-muted"}`}>
                    {formatMoneyDecimal(a.unpaid)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      disabled={a.unpaid <= 0}
                      onClick={() => setTarget(a)}
                      className="btn-accent btn-sm"
                    >
                      Pay Commission
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && (data ?? []).length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-muted">No agents yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <PayoutModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

function PayoutModal({ target, onClose }: { target: AdminAgent | null; onClose: () => void }) {
  const qc = useQueryClient();
  const pay = useMutation({
    mutationFn: () => api.post(`/agents/${target!.id}/pay-commission`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agents"] });
      onClose();
    },
  });

  return (
    <Modal
      open={Boolean(target)}
      onClose={onClose}
      title="Pay agent commissions"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => pay.mutate()}
            disabled={pay.isPending}
            className="btn-accent"
          >
            {pay.isPending ? "Paying…" : `Pay ${target ? formatMoneyDecimal(target.unpaid) : ""}`}
          </button>
        </>
      }
    >
      {target && (
        <div className="space-y-2 font-body text-sm">
          <div>
            <span className="text-muted">Agent:</span>{" "}
            <span className="font-bold">{target.contactName ?? target.email}</span>
          </div>
          <div>
            <span className="text-muted">Unpaid commissions:</span>{" "}
            <span className="font-display text-lg font-bold text-orange">
              {formatMoneyDecimal(target.unpaid)}
            </span>
          </div>
          <div className="text-xs text-muted">
            This marks all pending commission rows as paid and logs the transaction.
          </div>
        </div>
      )}
    </Modal>
  );
}
