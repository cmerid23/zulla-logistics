import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { formatMoneyDecimal } from "../../lib/utils";

interface AdminShipper {
  id: string;
  userId: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  paymentTerms: number | null;
  creditLimit: string | null;
  email: string | null;
  loadCount: number;
}

export function AdminShippers() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "shippers"],
    queryFn: () => api.get<AdminShipper[]>("/shippers"),
  });

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Shippers</h1>
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["Company", "Contact", "Email", "Loads", "Payment terms", "Credit limit"].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-muted">Loading…</td></tr>
              )}
              {(data ?? []).map((s) => <ShipperRow key={s.id} shipper={s} />)}
              {!isLoading && (data ?? []).length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-muted">No shippers yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

function ShipperRow({ shipper }: { shipper: AdminShipper }) {
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: (vars: { creditLimit?: string; paymentTerms?: number }) =>
      api.patch<AdminShipper>(`/admin/shippers/${shipper.id}`, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "shippers"] }),
  });

  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="px-3 py-3 font-display font-bold">{shipper.companyName}</td>
      <td className="px-3 py-3 mono text-xs">{shipper.contactName ?? "—"}</td>
      <td className="px-3 py-3 mono text-xs">{shipper.email ?? "—"}</td>
      <td className="px-3 py-3 mono text-xs text-accent">{shipper.loadCount}</td>
      <td className="px-3 py-3">
        <InlineNumber
          value={shipper.paymentTerms ?? 30}
          suffix=" days"
          onSave={(v) => update.mutate({ paymentTerms: v })}
          pending={update.isPending}
        />
      </td>
      <td className="px-3 py-3">
        <InlineDecimal
          value={shipper.creditLimit ?? "0"}
          onSave={(v) => update.mutate({ creditLimit: v })}
          pending={update.isPending}
        />
      </td>
    </tr>
  );
}

function InlineNumber({
  value,
  suffix,
  onSave,
  pending,
}: {
  value: number;
  suffix?: string;
  onSave: (v: number) => void;
  pending?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        className="mono text-sm hover:text-accent"
      >
        {value}{suffix}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <input
        type="number"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="input mono w-24 px-2 py-1 text-sm"
      />
      <button
        onClick={() => {
          onSave(Number(draft));
          setEditing(false);
        }}
        disabled={pending}
        className="btn-accent btn-sm"
      >
        ✓
      </button>
      <button onClick={() => setEditing(false)} className="btn-ghost btn-sm">✕</button>
    </span>
  );
}

function InlineDecimal({
  value,
  onSave,
  pending,
}: {
  value: string;
  onSave: (v: string) => void;
  pending?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button onClick={() => { setDraft(value); setEditing(true); }} className="mono text-sm hover:text-accent">
        {formatMoneyDecimal(value)}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ""))}
        className="input mono w-28 px-2 py-1 text-sm"
      />
      <button
        onClick={() => {
          onSave(Number(draft).toFixed(2));
          setEditing(false);
        }}
        disabled={pending}
        className="btn-accent btn-sm"
      >
        ✓
      </button>
      <button onClick={() => setEditing(false)} className="btn-ghost btn-sm">✕</button>
    </span>
  );
}
