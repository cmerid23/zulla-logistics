import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";

interface AgentShipper {
  id: string;
  userId: string;
  companyName: string;
  contactName: string | null;
  phone: string | null;
  billingAddress: string | null;
  paymentTerms: number | null;
  creditLimit: string | null;
  email: string | null;
  loadCount: number;
}

const newShipperSchema = z.object({
  email: z.string().email(),
  companyName: z.string().min(1).max(256),
  contactName: z.string().min(1).max(256),
  phone: z.string().max(32).optional(),
  billingAddress: z.string().max(500).optional(),
  paymentTerms: z.coerce.number().int().min(0).max(180).default(30),
});
type NewShipper = z.infer<typeof newShipperSchema>;

export function AgentShippers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["agent", "shippers"],
    queryFn: () => api.get<AgentShipper[]>("/agents/me/shippers"),
  });

  const create = useMutation({
    mutationFn: (input: NewShipper) => api.post<AgentShipper>("/agents/me/shippers", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent", "shippers"] });
      setOpen(false);
    },
  });

  const items = data ?? [];

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">My shippers</h1>
        <button onClick={() => setOpen(true)} className="btn-accent">+ Add new shipper</button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <Card key={s.id}>
            <CardHeader className="border-white/[0.07] flex items-center justify-between">
              <span className="font-display text-base font-bold">{s.companyName}</span>
              <span className="mono text-[10px] uppercase tracking-wider text-muted">
                {s.loadCount} loads
              </span>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="font-body text-white/90">{s.contactName ?? "—"}</div>
              <div className="mono text-[11px] uppercase tracking-wider text-muted">
                {s.email ?? "—"} {s.phone ? ` · ${s.phone}` : ""}
              </div>
              <div className="mono text-[11px] uppercase tracking-wider text-muted">
                Net {s.paymentTerms ?? 30} days
              </div>
              <Link
                to={`/agent/post-load?shipperId=${s.id}`}
                className="btn-accent btn-sm w-full"
              >
                Post load for shipper
              </Link>
            </CardBody>
          </Card>
        ))}
        {isLoading && <div className="text-sm text-muted">Loading…</div>}
        {!isLoading && items.length === 0 && (
          <div className="card md:col-span-2 lg:col-span-3 p-8 text-center text-sm text-muted">
            No shippers yet. Add one to get started.
          </div>
        )}
      </div>

      <NewShipperModal open={open} onClose={() => setOpen(false)} onSubmit={(v) => create.mutate(v)} pending={create.isPending} error={create.error?.message} />
    </div>
  );
}

function NewShipperModal({
  open,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (v: NewShipper) => void;
  pending: boolean;
  error?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<NewShipper>({ resolver: zodResolver(newShipperSchema), defaultValues: { paymentTerms: 30 } });

  function close() {
    reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add new shipper"
      footer={
        <>
          <button onClick={close} className="btn-ghost">Cancel</button>
          <button form="new-shipper-form" type="submit" disabled={pending} className="btn-accent">
            {pending ? "Saving…" : "Add shipper"}
          </button>
        </>
      }
    >
      <form id="new-shipper-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="Company name" error={errors.companyName?.message}>
          <input className="input" {...register("companyName")} />
        </Field>
        <Field label="Contact name" error={errors.contactName?.message}>
          <input className="input" {...register("contactName")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" className="input" {...register("email")} />
        </Field>
        <Field label="Phone">
          <input className="input" {...register("phone")} />
        </Field>
        <Field label="Billing address">
          <textarea className="input" rows={2} {...register("billingAddress")} />
        </Field>
        <Field label="Payment terms (days)">
          <input type="number" className="input" {...register("paymentTerms")} />
        </Field>
        {error && <div className="text-xs text-red-400">{error}</div>}
      </form>
    </Modal>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
