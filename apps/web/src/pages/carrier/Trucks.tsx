import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  EQUIPMENT_LABEL,
  EQUIPMENT_TYPES,
  US_STATES,
  createTruckSchema,
  type CreateTruckInput,
  type Truck,
} from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { formatDate } from "../../lib/utils";

function expiryTone(date?: string | null): "danger" | "warning" | "muted" {
  if (!date) return "muted";
  const ms = new Date(date).getTime() - Date.now();
  if (ms < 0) return "danger";
  if (ms < 30 * 24 * 60 * 60 * 1000) return "warning";
  return "muted";
}

export function CarrierTrucks() {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["trucks"],
    queryFn: () => api.get<Truck[]>("/trucks"),
  });

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Fleet</h1>
        <button onClick={() => setOpen(true)} className="btn-accent">+ Add truck</button>
      </div>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["Unit #", "Year/Make/Model", "Type", "VIN", "Plate", "Insurance expiry", "Reg expiry"].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">Loading…</td></tr>
              )}
              {(data ?? []).map((t) => {
                const insTone = expiryTone(t.insuranceExpiry);
                const regTone = expiryTone(t.registrationExpiry);
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-3 mono text-xs">{t.unitNumber ?? "—"}</td>
                    <td className="px-3 py-3">
                      {t.year ?? "—"} {t.make ?? ""} {t.model ?? ""}
                    </td>
                    <td className="px-3 py-3 mono text-xs">{t.type ?? "—"}</td>
                    <td className="px-3 py-3 mono text-xs">{t.vin ?? "—"}</td>
                    <td className="px-3 py-3 mono text-xs">
                      {t.plate ?? "—"}{t.plateState ? ` (${t.plateState})` : ""}
                    </td>
                    <td className={`px-3 py-3 mono text-xs ${insTone === "danger" ? "text-red-400" : insTone === "warning" ? "text-orange" : ""}`}>
                      {formatDate(t.insuranceExpiry)}
                    </td>
                    <td className={`px-3 py-3 mono text-xs ${regTone === "danger" ? "text-red-400" : regTone === "warning" ? "text-orange" : ""}`}>
                      {formatDate(t.registrationExpiry)}
                    </td>
                  </tr>
                );
              })}
              {!isLoading && (data ?? []).length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">No trucks yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <NewTruckModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function NewTruckModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTruckInput>({ resolver: zodResolver(createTruckSchema) });

  const create = useMutation({
    mutationFn: (input: CreateTruckInput) => api.post<Truck>("/trucks", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trucks"] });
      reset();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add truck"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button form="new-truck-form" type="submit" disabled={create.isPending} className="btn-accent">
            {create.isPending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="new-truck-form" onSubmit={handleSubmit((v) => create.mutate(v))} className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Unit #" error={errors.unitNumber?.message}>
          <input className="input mono" {...register("unitNumber")} />
        </Field>
        <Field label="VIN" error={errors.vin?.message}>
          <input className="input mono" {...register("vin")} />
        </Field>
        <Field label="Year">
          <input type="number" className="input" {...register("year", { valueAsNumber: true })} />
        </Field>
        <Field label="Make">
          <input className="input" {...register("make")} />
        </Field>
        <Field label="Model">
          <input className="input" {...register("model")} />
        </Field>
        <Field label="Type">
          <select className="input" {...register("type")}>
            <option value="">—</option>
            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{EQUIPMENT_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="Plate">
          <input className="input mono" {...register("plate")} />
        </Field>
        <Field label="Plate state">
          <select className="input" {...register("plateState")}>
            <option value="">—</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Insurance expiry">
          <input type="date" className="input" {...register("insuranceExpiry")} />
        </Field>
        <Field label="Registration expiry">
          <input type="date" className="input" {...register("registrationExpiry")} />
        </Field>
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
