import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  carrierOnboardingSchema,
  EQUIPMENT_TYPES,
  EQUIPMENT_LABEL,
  US_STATES,
  type CarrierOnboardingInput,
} from "@zulla/shared";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const steps = ["Authority", "Equipment", "Banking", "Review"] as const;

export function OnboardingSteps() {
  const [step, setStep] = useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
    control,
  } = useForm<CarrierOnboardingInput>({
    resolver: zodResolver(carrierOnboardingSchema),
    defaultValues: {
      equipmentTypes: [],
      preferredOriginStates: [],
      preferredDestStates: [],
    },
  });

  const submit = useMutation({
    mutationFn: (input: CarrierOnboardingInput) =>
      api.post("/carriers/onboard", { ...input, onboardingComplete: true }),
  });

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-2 text-sm">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-2 ${i <= step ? "text-brand-600" : "text-ink-400"}`}
          >
            <span className={`grid h-6 w-6 place-items-center rounded-full ${i <= step ? "bg-brand-500 text-white" : "bg-ink-100"}`}>
              {i + 1}
            </span>
            {label}
            {i < steps.length - 1 && <span className="mx-2 h-px w-8 bg-ink-100" />}
          </li>
        ))}
      </ol>

      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={handleSubmit((v) => submit.mutate(v))}
      >
        {step === 0 && (
          <>
            <Input label="MC #" {...register("mcNumber")} />
            <Input label="DOT #" {...register("dotNumber")} />
            <Input label="Authority status" placeholder="Active / Inactive" {...register("authorityStatus")} />
            <Input label="Authority active since" type="date" {...register("authoritySince")} />
            <Input label="Insurance expiry" type="date" {...register("insuranceExpiry")} />
            <Input label="Safety rating" placeholder="Satisfactory / Conditional" {...register("safetyRating")} />
          </>
        )}

        {step === 1 && (
          <>
            <Controller
              control={control}
              name="equipmentTypes"
              render={({ field }) => (
                <fieldset className="md:col-span-2">
                  <legend className="mb-2 text-sm font-medium">Equipment types</legend>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {EQUIPMENT_TYPES.map((t) => {
                      const checked = field.value?.includes(t) ?? false;
                      return (
                        <label key={t} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(field.value ?? []);
                              if (e.target.checked) next.add(t);
                              else next.delete(t);
                              field.onChange(Array.from(next));
                            }}
                          />
                          {EQUIPMENT_LABEL[t]}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            />
            <StatesPicker control={control} name="preferredOriginStates" label="Preferred origin states" />
            <StatesPicker control={control} name="preferredDestStates" label="Preferred destination states" />
          </>
        )}

        {step === 2 && (
          <>
            <Input label="Bank routing" {...register("bankRouting")} />
            <Input label="Bank account" {...register("bankAccount")} />
            <Input label="Factoring partner" {...register("factoringPartner")} />
            <Input label="Factoring account" {...register("factoringAccount")} />
          </>
        )}

        {step === 3 && (
          <pre className="md:col-span-2 overflow-x-auto rounded-md bg-ink-50 p-3 text-xs">
{JSON.stringify(getValues(), null, 2)}
          </pre>
        )}

        {Object.keys(errors).length > 0 && (
          <div className="md:col-span-2 text-sm text-red-600">
            {Object.values(errors)[0]?.message ?? "Please correct the errors above."}
          </div>
        )}

        <div className="md:col-span-2 flex items-center justify-between">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)}>Next</Button>
          ) : (
            <Button type="submit" disabled={isSubmitting || submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

interface StatesPickerProps {
  control: ReturnType<typeof useForm<CarrierOnboardingInput>>["control"];
  name: "preferredOriginStates" | "preferredDestStates";
  label: string;
}

function StatesPicker({ control, name, label }: StatesPickerProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{label}</span>
          <select
            multiple
            className="input h-32"
            value={field.value ?? []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value);
              field.onChange(selected);
            }}
          >
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      )}
    />
  );
}
