import { useState } from "react";

const FACTORING_PARTNERS = ["OTR Solutions", "RTS Financial", "Apex Capital"] as const;

export interface Step5Data {
  method: "ach" | "factoring";
  bankRouting?: string;
  bankAccount?: string;
  factoringPartner?: string;
  factoringAccount?: string;
}

interface Props {
  onNext: (data: Step5Data) => void;
  onBack: () => void;
  initial?: Step5Data;
}

export function Step5Payment({ onNext, onBack, initial }: Props) {
  const [method, setMethod] = useState<"ach" | "factoring">(initial?.method ?? "ach");
  const [bankRouting, setBankRouting] = useState(initial?.bankRouting ?? "");
  const [bankAccount, setBankAccount] = useState(initial?.bankAccount ?? "");
  const [factoringPartner, setFactoringPartner] = useState(initial?.factoringPartner ?? FACTORING_PARTNERS[0]);
  const [factoringAccount, setFactoringAccount] = useState(initial?.factoringAccount ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (method === "ach") {
      if (!/^\d{9}$/.test(bankRouting)) return setError("Routing number must be 9 digits");
      if (!/^\d{4,17}$/.test(bankAccount)) return setError("Account number must be 4-17 digits");
      onNext({ method, bankRouting, bankAccount });
    } else {
      if (!factoringAccount.trim()) return setError("Factoring account number required");
      onNext({ method, factoringPartner, factoringAccount });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">How do you want to get paid?</h1>
        <p className="mt-1 font-body text-sm text-muted">
          Banking info is encrypted (AES-256-GCM) before it touches our database.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <RadioCard
          label="Direct ACH Payment"
          sub="72-hour pay, no factoring fees"
          checked={method === "ach"}
          onClick={() => setMethod("ach")}
        />
        <RadioCard
          label="Use Factoring Partner"
          sub="Same-day pay via OTR / RTS / Apex"
          checked={method === "factoring"}
          onClick={() => setMethod("factoring")}
        />
      </div>

      {method === "ach" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Routing number">
            <input
              className="input mono"
              type="password"
              autoComplete="off"
              value={bankRouting}
              onChange={(e) => setBankRouting(e.target.value.replace(/\D/g, ""))}
              maxLength={9}
              placeholder="9 digits"
            />
          </Field>
          <Field label="Account number">
            <input
              className="input mono"
              type="password"
              autoComplete="off"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ""))}
              maxLength={17}
              placeholder="Up to 17 digits"
            />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Factoring partner">
            <select
              className="input"
              value={factoringPartner}
              onChange={(e) => setFactoringPartner(e.target.value)}
            >
              {FACTORING_PARTNERS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Factoring account #">
            <input
              className="input mono"
              value={factoringAccount}
              onChange={(e) => setFactoringAccount(e.target.value)}
              placeholder="Account ID with your factor"
            />
          </Field>
        </div>
      )}

      {error && <div className="text-xs text-red-400">{error}</div>}

      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} className="btn-ghost btn-lg">← Back</button>
        <button type="button" onClick={submit} className="btn-accent btn-lg">Continue →</button>
      </div>
    </div>
  );
}

function RadioCard({ label, sub, checked, onClick }: { label: string; sub: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-card border p-5 text-left transition ${
        checked ? "border-accent/60 bg-accent/[0.06]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14]"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`grid h-5 w-5 place-items-center rounded-full border ${checked ? "border-accent bg-accent" : "border-white/20"}`}>
          {checked && <span className="h-2 w-2 rounded-full bg-black" />}
        </span>
        <span className="font-display text-base font-bold">{label}</span>
      </div>
      <div className="mt-2 mono text-[11px] uppercase tracking-wider text-muted">{sub}</div>
    </button>
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
