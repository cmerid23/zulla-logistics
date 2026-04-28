import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { US_STATES, type Load } from "@zulla/shared";
import { api } from "../../lib/api";
import {
  RateSuggestionCard,
  type RateSuggestion,
} from "../../components/shipper/RateSuggestionCard";

const EQUIPMENT = ["Van", "Flatbed", "Reefer", "Step Deck", "Other"] as const;

const formSchema = z.object({
  shipperId: z.string().uuid("Pick a shipper"),
  originCity: z.string().min(1),
  originState: z.string().length(2),
  destinationCity: z.string().min(1),
  destinationState: z.string().length(2),
  pickupDate: z.string().min(1),
  deliveryDate: z.string().optional(),
  equipmentType: z.enum(EQUIPMENT),
  weightLbs: z.coerce.number().int().positive(),
  commodity: z.string().min(1),
  specialInstructions: z.string().optional(),
  referenceNumber: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

interface AgentShipper {
  id: string;
  companyName: string;
}

export function AgentPostLoad() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const presetShipper = params.get("shipperId") ?? undefined;
  const [suggestion, setSuggestion] = useState<RateSuggestion | null>(null);
  const [snapshot, setSnapshot] = useState<FormData | null>(null);

  const shippersQuery = useQuery({
    queryKey: ["agent", "shippers"],
    queryFn: () => api.get<AgentShipper[]>("/agents/me/shippers"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { equipmentType: "Van", shipperId: presetShipper },
  });

  const suggest = useMutation({
    mutationFn: (data: FormData) =>
      api.post<RateSuggestion>("/ai/rate-suggestion", {
        originCity: data.originCity,
        originState: data.originState,
        destinationCity: data.destinationCity,
        destinationState: data.destinationState,
        equipmentType: data.equipmentType,
        weightLbs: data.weightLbs,
        pickupDate: data.pickupDate,
      }),
    onSuccess: (r) => setSuggestion(r),
  });

  const create = useMutation({
    mutationFn: (vars: { shipperRate: string; carrierRate: string }) => {
      const f = snapshot!;
      return api.post<Load>("/loads", {
        shipperId: f.shipperId,
        originCity: f.originCity,
        originState: f.originState,
        destinationCity: f.destinationCity,
        destinationState: f.destinationState,
        pickupDate: new Date(f.pickupDate).toISOString(),
        deliveryDate: f.deliveryDate ? new Date(f.deliveryDate).toISOString() : undefined,
        equipmentType: f.equipmentType,
        weightLbs: f.weightLbs,
        commodity: f.commodity,
        specialInstructions: f.specialInstructions,
        referenceNumber: f.referenceNumber,
        shipperRate: vars.shipperRate,
        carrierRate: vars.carrierRate,
      });
    },
    onSuccess: () => navigate("/agent/loads"),
  });

  function onSubmit(data: FormData) {
    setSnapshot(data);
    suggest.mutate(data);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Post a load</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Shipper" error={errors.shipperId?.message}>
          <select className="input" {...register("shipperId")}>
            <option value="">Select…</option>
            {(shippersQuery.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.companyName}</option>
            ))}
          </select>
        </Field>
        <Field label="Reference (optional)">
          <input className="input" {...register("referenceNumber")} />
        </Field>

        <Field label="Origin city" error={errors.originCity?.message}>
          <input className="input" {...register("originCity")} />
        </Field>
        <Field label="Origin state" error={errors.originState?.message}>
          <select className="input" {...register("originState")}>
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Destination city" error={errors.destinationCity?.message}>
          <input className="input" {...register("destinationCity")} />
        </Field>
        <Field label="Destination state" error={errors.destinationState?.message}>
          <select className="input" {...register("destinationState")}>
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Pickup date" error={errors.pickupDate?.message}>
          <input type="datetime-local" className="input" {...register("pickupDate")} />
        </Field>
        <Field label="Delivery date">
          <input type="datetime-local" className="input" {...register("deliveryDate")} />
        </Field>

        <fieldset className="md:col-span-2">
          <span className="mb-2 block mono text-[11px] uppercase tracking-wider text-muted">Equipment</span>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT.map((e) => (
              <label key={e} className="cursor-pointer">
                <input type="radio" value={e} {...register("equipmentType")} className="peer hidden" />
                <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-4 py-2 mono text-xs uppercase tracking-wider text-white/80 peer-checked:border-accent peer-checked:bg-accent peer-checked:text-black">
                  {e}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Weight (lbs)" error={errors.weightLbs?.message}>
          <input type="number" className="input mono" {...register("weightLbs", { valueAsNumber: true })} />
        </Field>
        <Field label="Commodity" error={errors.commodity?.message}>
          <input className="input" {...register("commodity")} />
        </Field>

        <label className="md:col-span-2">
          <span className="mb-1 block mono text-[11px] uppercase tracking-wider text-muted">Special instructions</span>
          <textarea className="input" rows={3} {...register("specialInstructions")} />
        </label>

        <div className="md:col-span-2">
          <button type="submit" disabled={suggest.isPending} className="btn-accent btn-lg">
            {suggest.isPending ? "Analyzing lane rates…" : "Get AI rate suggestion"}
          </button>
        </div>
      </form>

      {suggestion && (
        <RateSuggestionCard
          suggestion={suggestion}
          onAccept={(rates) => create.mutate(rates)}
          pending={create.isPending}
        />
      )}
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
