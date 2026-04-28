import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createDriverSchema,
  type CreateDriverInput,
  type Driver,
  US_STATES,
} from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { formatDate } from "../../lib/utils";

function expiryTone(date?: string | null): "danger" | "warning" | "muted" {
  if (!date) return "muted";
  const ms = new Date(date).getTime() - Date.now();
  if (ms < 0) return "danger";
  if (ms < 30 * 24 * 60 * 60 * 1000) return "warning";
  return "muted";
}

export function CarrierDrivers() {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.get<Driver[]>("/drivers"),
  });

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Drivers</h1>
        <button onClick={() => setOpen(true)} className="btn-accent">+ Add driver</button>
      </div>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["Name", "CDL", "CDL expiry", "Med card", "Hire date", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">Loading…</td></tr>
              )}
              {(data ?? []).map((d) => {
                const cdlTone = expiryTone(d.cdlExpiry);
                const medTone = expiryTone(d.medicalCardExpiry);
                return (
                  <tr key={d.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-3 font-display font-bold">
                      <Link to={`/carrier/drivers/${d.id}`} className="hover:text-accent">{d.name}</Link>
                    </td>
                    <td className="px-3 py-3 mono text-xs">
                      {d.cdlNumber ?? "—"}{d.cdlState ? ` (${d.cdlState})` : ""}
                    </td>
                    <td className={`px-3 py-3 mono text-xs ${cdlTone === "danger" ? "text-red-400" : cdlTone === "warning" ? "text-orange" : ""}`}>
                      {formatDate(d.cdlExpiry)}
                    </td>
                    <td className={`px-3 py-3 mono text-xs ${medTone === "danger" ? "text-red-400" : medTone === "warning" ? "text-orange" : ""}`}>
                      {formatDate(d.medicalCardExpiry)}
                    </td>
                    <td className="px-3 py-3 mono text-xs">{formatDate(d.hireDate)}</td>
                    <td className="px-3 py-3">
                      <Badge tone={d.status === "active" ? "success" : d.status === "terminated" ? "danger" : "warning"}>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link to={`/carrier/drivers/${d.id}`} className="btn-ghost btn-sm">DQ file</Link>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && (data ?? []).length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">No drivers yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <NewDriverModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function NewDriverModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateDriverInput>({
    resolver: zodResolver(createDriverSchema),
    defaultValues: { status: "active" },
  });

  const create = useMutation({
    mutationFn: (input: CreateDriverInput) => api.post<Driver>("/drivers", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add driver"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button form="new-driver-form" type="submit" disabled={isSubmitting || create.isPending} className="btn-accent">
            {create.isPending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="new-driver-form" onSubmit={handleSubmit((v) => create.mutate(v))} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Name" error={errors.name?.message} className="md:col-span-2">
          <input className="input" {...register("name")} />
        </Field>
        <Field label="CDL #" error={errors.cdlNumber?.message}>
          <input className="input mono" {...register("cdlNumber")} />
        </Field>
        <Field label="CDL state" error={errors.cdlState?.message}>
          <select className="input" {...register("cdlState")}>
            <option value="">—</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="CDL expiry">
          <input type="date" className="input" {...register("cdlExpiry")} />
        </Field>
        <Field label="Medical card expiry">
          <input type="date" className="input" {...register("medicalCardExpiry")} />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input className="input" {...register("phone")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" className="input" {...register("email")} />
        </Field>
        <Field label="Hire date">
          <input type="date" className="input" {...register("hireDate")} />
        </Field>
      </form>
    </Modal>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
