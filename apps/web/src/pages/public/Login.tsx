import { useNavigate, Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@zulla/shared";
import { useAuth } from "../../hooks/useAuth";
import { Logo } from "../../components/marketing/Logo";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginInput) =>
    login.mutate(values, {
      onSuccess: (data) => {
        const target =
          from ??
          (data.user.role === "carrier"
            ? "/loadboard"
            : data.user.role === "shipper"
              ? "/shipper/dashboard"
              : data.user.role === "agent"
                ? "/agent"
                : "/admin");
        navigate(target, { replace: true });
      },
    });

  return (
    <div className="grid min-h-screen place-items-center bg-black px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card p-7">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Sign in</h1>
          <p className="mt-1 font-body text-sm text-muted">Welcome back to Zulla.</p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Field label="Email" error={errors.email?.message}>
              <input type="email" className="input" autoComplete="email" {...register("email")} />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <input type="password" className="input" autoComplete="current-password" {...register("password")} />
            </Field>
            {login.error && <div className="text-xs text-red-400">{(login.error as Error).message}</div>}
            <button className="btn-accent btn-lg w-full" type="submit" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-5 text-center font-body text-sm text-muted">
            New here? <Link to="/register" className="text-accent hover:underline">Create an account</Link>
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
