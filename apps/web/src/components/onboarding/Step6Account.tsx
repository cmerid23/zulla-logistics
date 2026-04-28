import { useMemo, useState } from "react";

export interface Step6Data {
  email: string;
  password: string;
}

interface Props {
  onSubmit: (data: Step6Data) => void;
  onBack: () => void;
  pending?: boolean;
  error?: string;
}

function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 14) score++;
  return Math.min(score, 4);
}

const STRENGTH_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["bg-red-500", "bg-red-400", "bg-orange", "bg-accent", "bg-green"];

export function Step6Account({ onSubmit, onBack, pending, error }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && password.length >= 8;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Create your account</h1>
        <p className="mt-1 font-body text-sm text-muted">
          Last step. We&apos;ll send a confirmation to this email.
        </p>
      </div>

      <Field label="Email">
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="ops@yourcompany.com"
        />
      </Field>

      <Field label="Password">
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setTouched(true);
          }}
          autoComplete="new-password"
          placeholder="Min 8 chars · letters + number"
        />
        {touched && (
          <div className="mt-2">
            <div className="flex h-1.5 gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    i < score ? STRENGTH_COLOR[score] ?? "bg-accent" : "bg-white/[0.07]"
                  }`}
                />
              ))}
            </div>
            <div className="mt-1 mono text-[10px] uppercase tracking-wider text-muted">
              {STRENGTH_LABEL[score]}
            </div>
          </div>
        )}
      </Field>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} className="btn-ghost btn-lg" disabled={pending}>
          ← Back
        </button>
        <button
          type="button"
          onClick={() => onSubmit({ email, password })}
          disabled={!valid || pending}
          className="btn-accent btn-lg"
        >
          {pending ? "Creating account…" : "Create Account & Submit"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}
