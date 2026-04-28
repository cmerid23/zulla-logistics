import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { INVOICE_STATUSES, type Invoice, type InvoiceStatus } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

const TABS: Array<{ key: InvoiceStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid" },
  { key: "factoring_submitted", label: "Factoring" },
];

const FACTORING_PARTNERS = ["OTR Solutions", "RTS Financial", "Apex Capital"] as const;

export function AdminInvoices() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<InvoiceStatus | "all">("all");
  const [target, setTarget] = useState<Invoice | null>(null);

  const { data } = useQuery({
    queryKey: ["admin", "invoices"],
    queryFn: () => api.get<Invoice[]>("/invoices"),
  });

  const items = useMemo(() => {
    const all = data ?? [];
    return tab === "all" ? all : all.filter((i) => i.status === tab);
  }, [data, tab]);

  const markPaid = useMutation({
    mutationFn: (id: string) => api.post(`/invoices/${id}/mark-paid`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "invoices"] }),
  });

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Invoice center</h1>

      <div className="flex gap-1 border-b border-white/[0.07]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`mono px-4 py-2 text-[11px] uppercase tracking-wider transition ${
              tab === t.key ? "text-white border-b-2 border-accent" : "text-muted hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["Invoice #", "Shipper", "Load", "Amount", "Status", "Due", "Factoring", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {items.map((inv) => {
                const overdue =
                  inv.status === "pending" && inv.dueAt && new Date(inv.dueAt).getTime() < Date.now();
                return (
                  <tr key={inv.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-3 mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-3 py-3 mono text-xs">{inv.shipperId.slice(0, 8)}</td>
                    <td className="px-3 py-3 mono text-xs">{inv.loadId.slice(0, 8)}</td>
                    <td className="px-3 py-3 font-display font-bold">{formatMoneyDecimal(inv.amount)}</td>
                    <td className="px-3 py-3">
                      <Badge tone={inv.status === "paid" ? "success" : inv.status === "factoring_submitted" ? "info" : "warning"}>
                        {inv.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className={`px-3 py-3 mono text-xs ${overdue ? "text-red-400" : ""}`}>
                      {formatDate(inv.dueAt)}
                    </td>
                    <td className="px-3 py-3 mono text-xs">
                      {inv.factoringSubmitted ? inv.factoringPartner ?? "Submitted" : "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {!inv.factoringSubmitted && (
                          <button onClick={() => setTarget(inv)} className="btn-orange btn-sm">
                            Factoring
                          </button>
                        )}
                        {inv.status !== "paid" && (
                          <button
                            onClick={() => markPaid.mutate(inv.id)}
                            disabled={markPaid.isPending}
                            className="btn-accent btn-sm"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-sm text-muted">No invoices in this view.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <FactoringModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

function FactoringModal({ target, onClose }: { target: Invoice | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [partner, setPartner] = useState<string>(FACTORING_PARTNERS[0]);
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/invoices/${target!.id}/factoring`, { partner, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "invoices"] });
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
      <div className="space-y-4">
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
