import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EQUIPMENT_LABEL, EQUIPMENT_TYPES, US_STATES } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

interface DedicatedLane {
  id: string;
  shipperId: string;
  originState: string;
  destState: string;
  equipmentType: string;
  weeklyVolume: number | null;
  lockedRate: string | null;
  carrierRate: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "requested" | "approved" | "active" | "completed" | "cancelled";
  agreementPdfR2Key: string | null;
  signedByShipperAt: string | null;
}

const requestSchema = z.object({
  originState: z.string().length(2),
  destState: z.string().length(2),
  equipmentType: z.string().min(1),
  weeklyVolume: z.coerce.number().int().positive(),
  durationDays: z.coerce.number().refine((v) => [30, 60, 90].includes(v)),
  maxRate: z.string().regex(/^\d+(\.\d+)?$/, "Numeric only"),
});
type RequestInput = z.infer<typeof requestSchema>;

export function ShipperDedicatedLanes() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["shipper", "dedicated-lanes"],
    queryFn: () => api.get<DedicatedLane[]>("/dedicated-lanes/me"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RequestInput>({
    resolver: zodResolver(requestSchema),
    defaultValues: { durationDays: 30, equipmentType: "van" },
  });

  const create = useMutation({
    mutationFn: (input: RequestInput) => api.post<DedicatedLane>("/dedicated-lanes", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipper", "dedicated-lanes"] });
      reset();
    },
  });

  const sign = useMutation({
    mutationFn: (id: string) => api.post(`/dedicated-lanes/${id}/sign`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipper", "dedicated-lanes"] }),
  });

  async function downloadAgreement(id: string) {
    const { url } = await api.get<{ url: string }>(`/dedicated-lanes/${id}/agreement`);
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-6 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Dedicated lanes</h1>

      <Card>
        <CardHeader className="border-white/[0.07]">
          <span className="font-display text-base font-bold">Request a dedicated lane</span>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={handleSubmit((v) => create.mutate(v))}
            className="grid grid-cols-1 gap-3 md:grid-cols-3"
          >
            <Field label="Origin state" error={errors.originState?.message}>
              <select className="input" {...register("originState")}>
                <option value="">Select…</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Destination state" error={errors.destState?.message}>
              <select className="input" {...register("destState")}>
                <option value="">Select…</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Equipment" error={errors.equipmentType?.message}>
              <select className="input" {...register("equipmentType")}>
                {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{EQUIPMENT_LABEL[t]}</option>)}
              </select>
            </Field>
            <Field label="Weekly volume" error={errors.weeklyVolume?.message}>
              <input type="number" className="input mono" {...register("weeklyVolume")} />
            </Field>
            <Field label="Duration" error={errors.durationDays?.message}>
              <select className="input" {...register("durationDays")}>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </Field>
            <Field label="Max rate ($)" error={errors.maxRate?.message}>
              <input className="input mono" placeholder="2100.00" {...register("maxRate")} />
            </Field>
            <div className="md:col-span-3">
              <button type="submit" disabled={create.isPending} className="btn-accent">
                {create.isPending ? "Submitting…" : "Submit request"}
              </button>
              {create.error && (
                <span className="ml-3 text-xs text-red-400">{(create.error as Error).message}</span>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="border-white/[0.07]">
          <span className="font-display text-base font-bold">My dedicated lanes</span>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["Lane", "Equipment", "Volume", "Rate", "Window", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">Loading…</td></tr>
              )}
              {(data ?? []).map((l) => (
                <tr key={l.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-3 font-display font-bold">{l.originState} → {l.destState}</td>
                  <td className="px-3 py-3 mono text-xs">{l.equipmentType}</td>
                  <td className="px-3 py-3 mono text-xs">{l.weeklyVolume ?? 0}/wk</td>
                  <td className="px-3 py-3 mono text-green">{formatMoneyDecimal(l.lockedRate)}</td>
                  <td className="px-3 py-3 mono text-xs">
                    {formatDate(l.startDate)} → {formatDate(l.endDate)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={l.status === "active" ? "success" : l.status === "approved" ? "info" : "warning"}>
                      {l.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {l.agreementPdfR2Key && (
                        <button onClick={() => downloadAgreement(l.id)} className="btn-ghost btn-sm">
                          Agreement
                        </button>
                      )}
                      {l.status === "approved" && !l.signedByShipperAt && (
                        <button onClick={() => sign.mutate(l.id)} disabled={sign.isPending} className="btn-accent btn-sm">
                          Sign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && (data ?? []).length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">No dedicated lanes yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
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
