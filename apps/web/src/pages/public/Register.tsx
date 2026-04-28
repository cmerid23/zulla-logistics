import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../hooks/useAuth";
import { Logo } from "../../components/marketing/Logo";

// Marketing register form is shipper-only. Carriers go through /carrier/join,
// which collects far more info and creates the carrier profile in one shot.
const registerFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(1).max(256),
  contactName: z.string().min(1).max(256),
  phone: z
    .string()
    .regex(/^\+?[0-9\-\s().]{7,20}$/, "Invalid phone")
    .optional()
    .or(z.literal("")),
});
type RegisterFormData = z.infer<typeof registerFormSchema>;

export function Register() {
  const { register: registerUser } = useAuth();
  const [submitted, setSubmitted] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerFormSchema) });

  function onSubmit(values: RegisterFormData) {
    registerUser.mutate(
      { ...values, role: "shipper", phone: values.phone || undefined },
      { onSuccess: () => setSubmitted(values.email) },
    );
  }

  if (submitted) {
    return (
      <div className="grid min-h-screen place-items-center bg-black px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center"><Logo /></div>
          <div className="card p-7 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/12 text-3xl text-accent">✉</div>
            <h1 className="mt-5 font-display text-2xl font-extrabold tracking-tight">Check your email</h1>
            <p className="mt-2 font-body text-sm text-muted">
              We sent a verification link to <span className="text-white">{submitted}</span>. Click it to activate your account.
            </p>
            <Link to="/login" className="btn-ghost btn-lg mt-6 w-full">Back to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-black px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Create your shipper account</h1>
          <p className="mt-1 font-body text-sm text-muted">
            Carriers — <Link to="/carrier/join" className="text-accent">apply here</Link> instead.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Field label="Company name" error={errors.companyName?.message}>
              <input className="input" {...register("companyName")} />
            </Field>
            <Field label="Contact name" error={errors.contactName?.message}>
              <input className="input" {...register("contactName")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input type="email" className="input" autoComplete="email" {...register("email")} />
            </Field>
            <Field label="Phone (optional)" error={errors.phone?.message}>
              <input className="input" {...register("phone")} />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <input type="password" className="input" autoComplete="new-password" {...register("password")} />
            </Field>
            {registerUser.error && (
              <div className="text-xs text-red-400">{(registerUser.error as Error).message}</div>
            )}
            <button className="btn-accent btn-lg w-full" type="submit" disabled={registerUser.isPending}>
              {registerUser.isPending ? "Creating…" : "Create account"}
            </button>
          </form>
          <p className="mt-5 text-center font-body text-sm text-muted">
            Already have an account? <Link to="/login" className="text-accent hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
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
