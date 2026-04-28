import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  createLoadSchema,
  EQUIPMENT_TYPES,
  EQUIPMENT_LABEL,
  US_STATES,
  type CreateLoadInput,
  type Load,
} from "@zulla/shared";
import { api } from "../../lib/api";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface Props {
  onCreated?: (load: Load) => void;
}

export function PostLoadForm({ onCreated }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateLoadInput>({
    resolver: zodResolver(createLoadSchema),
    defaultValues: {
      equipmentType: "van",
      originState: "",
      destinationState: "",
    },
  });

  const create = useMutation({
    mutationFn: (input: CreateLoadInput) => api.post<Load>("/loads", input),
    onSuccess: (load) => {
      reset();
      onCreated?.(load);
    },
  });

  return (
    <form
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
      onSubmit={handleSubmit((v) => create.mutate(v))}
    >
      <Input label="Origin city" {...register("originCity")} error={errors.originCity?.message} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Origin state</span>
        <select className="input" {...register("originState")}>
          <option value="">Select…</option>
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <Input label="Destination city" {...register("destinationCity")} error={errors.destinationCity?.message} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Destination state</span>
        <select className="input" {...register("destinationState")}>
          <option value="">Select…</option>
          {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Equipment</span>
        <select className="input" {...register("equipmentType")}>
          {EQUIPMENT_TYPES.map((t) => (
            <option key={t} value={t}>{EQUIPMENT_LABEL[t]}</option>
          ))}
        </select>
      </label>
      <Input label="Weight (lbs)" type="number" {...register("weightLbs", { valueAsNumber: true })} />
      <Input label="Pickup date" type="datetime-local" {...register("pickupDate")} error={errors.pickupDate?.message} />
      <Input label="Delivery date" type="datetime-local" {...register("deliveryDate")} />
      <Input label="Distance (mi)" type="number" {...register("distanceMiles", { valueAsNumber: true })} />
      <Input label="Commodity" {...register("commodity")} />
      <Input label="Reference number" {...register("referenceNumber")} />

      <Input label="Shipper rate (USD)" placeholder="1850.00" {...register("shipperRate")} />
      <Input label="Carrier rate (USD)" placeholder="1500.00" {...register("carrierRate")} />

      <label className="md:col-span-2">
        <span className="mb-1 block text-sm font-medium">Special instructions</span>
        <textarea className="input" rows={3} {...register("specialInstructions")} />
      </label>

      <label className="md:col-span-2">
        <span className="mb-1 block text-sm font-medium">Internal notes</span>
        <textarea className="input" rows={2} {...register("internalNotes")} />
      </label>

      <div className="md:col-span-2">
        <Button type="submit" disabled={isSubmitting || create.isPending}>
          {create.isPending ? "Posting…" : "Post Load"}
        </Button>
      </div>
    </form>
  );
}
