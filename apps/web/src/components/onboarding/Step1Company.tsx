import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const yearOptions = ["<1", "1-3", "3-5", "5+"] as const;
const truckOptions = ["1", "2-5", "6-20", "20+"] as const;

export const step1Schema = z.object({
  companyName: z.string().min(2, "Company name required").max(256),
  mcNumber: z
    .string()
    .regex(/^MC-?\d{5,8}$/i, "Format: MC-1234567")
    .transform((v) => v.toUpperCase().replace(/^MC-?/, "MC-")),
  dotNumber: z.string().regex(/^\d{4,8}$/, "DOT number is 4-8 digits"),
  contactName: z.string().min(2).max(256),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9\-\s().]{7,20}$/, "Invalid phone"),
  yearsInBusiness: z.enum(yearOptions),
  numberOfTrucks: z.enum(truckOptions),
});
export type Step1Data = z.infer<typeof step1Schema>;

interface Props {
  onNext: (data: Step1Data) => void;
  initial?: Step1Data;
}

export function Step1Company({ onNext, initial }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: initial,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Tell us about your fleet</h1>
      <p className="font-body text-sm text-muted">
        We&apos;ll auto-fetch your authority from FMCSA SAFER in a couple of steps.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Company name" error={errors.companyName?.message}>
          <input className="input" {...register("companyName")} placeholder="Texas Lone Star Transport" />
        </Field>
        <Field label="MC number" error={errors.mcNumber?.message}>
          <input className="input mono" placeholder="MC-1234567" {...register("mcNumber")} />
        </Field>
        <Field label="DOT number" error={errors.dotNumber?.message}>
          <input className="input mono" placeholder="3456789" {...register("dotNumber")} />
        </Field>
        <Field label="Contact name" error={errors.contactName?.message}>
          <input className="input" {...register("contactName")} placeholder="Marcus Thomas" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input type="email" className="input" {...register("email")} placeholder="ops@yourcompany.com" />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <input className="input" {...register("phone")} placeholder="(555) 555-1212" />
        </Field>
        <Field label="Years in business" error={errors.yearsInBusiness?.message}>
          <select className="input" {...register("yearsInBusiness")}>
            <option value="">Select…</option>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field label="Number of trucks" error={errors.numberOfTrucks?.message}>
          <select className="input" {...register("numberOfTrucks")}>
            <option value="">Select…</option>
            {truckOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <div className="flex justify-end pt-4">
        <button type="submit" className="btn-accent btn-lg">Continue →</button>
      </div>
    </form>
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
