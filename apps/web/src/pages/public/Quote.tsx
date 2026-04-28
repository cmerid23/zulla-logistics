import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { EQUIPMENT_TYPES, EQUIPMENT_LABEL, US_STATES } from "@zulla/shared";
import { api } from "../../lib/api";
import { MarketingNav } from "../../components/marketing/MarketingNav";
import { Footer } from "../../components/marketing/Footer";
import { ProgressBar } from "../../components/onboarding/ProgressBar";
import { formatMoneyDecimal } from "../../lib/utils";

interface QuoteResult {
  leadId: string;
  estimatedRate: number | null;
  marginPct: number | null;
  rationale: string | null;
  message: string;
}

interface FormData {
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  equipmentType: string;
  weight: number | "";
  frequency: "spot" | "weekly" | "monthly" | "dedicated";
  pickupAt: string;
  specialRequirements: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
}

const STEP_LABELS = ["Lane", "Freight", "Schedule", "Contact"] as const;

export function PublicQuote() {
  const [params] = useSearchParams();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [form, setForm] = useState<FormData>({
    originCity: "",
    originState: params.get("origin_state") ?? "",
    destCity: "",
    destState: params.get("dest_state") ?? "",
    equipmentType: params.get("equipment") ?? "van",
    weight: "",
    frequency: "spot",
    pickupAt: "",
    specialRequirements: "",
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
  });

  const submit = useMutation({
    mutationFn: () =>
      api.post<QuoteResult>("/quote", {
        originCity: form.originCity,
        originState: form.originState,
        destCity: form.destCity,
        destState: form.destState,
        equipmentType: form.equipmentType,
        weight: form.weight === "" ? undefined : Number(form.weight),
        frequency: form.frequency,
        pickupAt: form.pickupAt ? new Date(form.pickupAt).toISOString() : undefined,
        specialRequirements: form.specialRequirements || undefined,
        companyName: form.companyName,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone,
      }),
  });

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  // ----- Step validity gates -----
  const stepValid: Record<number, boolean> = {
    0: form.originCity.length > 0 && form.originState.length === 2 && form.destCity.length > 0 && form.destState.length === 2,
    1: form.equipmentType.length > 0 && form.frequency.length > 0,
    2: true,
    3: form.companyName.length > 0 && form.contactName.length > 0 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) && form.phone.length >= 7,
  };

  // Auto-advance to results once submitted.
  useEffect(() => {
    if (submit.isSuccess) setStep(STEP_LABELS.length);
  }, [submit.isSuccess]);

  return (
    <div className="min-h-screen bg-black">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-20">
        {step < STEP_LABELS.length ? (
          <>
            <div className="mono mb-3 text-[11px] uppercase tracking-wider text-muted">
              Step {step + 1} of {STEP_LABELS.length} · {STEP_LABELS[step]}
            </div>
            <ProgressBar value={(step / STEP_LABELS.length) * 100} />
            <div className="mt-10">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  initial={{ x: direction * 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction * -40, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="space-y-5"
                >
                  {step === 0 && <StepLane form={form} setForm={setForm} />}
                  {step === 1 && <StepFreight form={form} setForm={setForm} />}
                  {step === 2 && <StepSchedule form={form} setForm={setForm} />}
                  {step === 3 && <StepContact form={form} setForm={setForm} />}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-10 flex items-center justify-between">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => go(step - 1)}
                className="btn-ghost btn-lg"
              >
                ← Back
              </button>
              {step < STEP_LABELS.length - 1 ? (
                <button
                  type="button"
                  disabled={!stepValid[step]}
                  onClick={() => go(step + 1)}
                  className="btn-accent btn-lg"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!stepValid[step] || submit.isPending}
                  onClick={() => submit.mutate()}
                  className="btn-accent btn-lg"
                >
                  {submit.isPending ? "Sending…" : "Get capacity"}
                </button>
              )}
            </div>
            {submit.error && (
              <div className="mt-4 text-sm text-red-400">{(submit.error as Error).message}</div>
            )}
          </>
        ) : (
          <ResultScreen result={submit.data} />
        )}
      </main>
      <Footer />
    </div>
  );
}

function StepLane({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Where are you moving freight?</h1>
      <p className="font-body text-sm text-muted">Origin and destination — city + state.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Origin city">
          <input className="input" value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })} />
        </Field>
        <Field label="Origin state">
          <select className="input" value={form.originState} onChange={(e) => setForm({ ...form, originState: e.target.value })}>
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Destination city">
          <input className="input" value={form.destCity} onChange={(e) => setForm({ ...form, destCity: e.target.value })} />
        </Field>
        <Field label="Destination state">
          <select className="input" value={form.destState} onChange={(e) => setForm({ ...form, destState: e.target.value })}>
            <option value="">Select…</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
    </>
  );
}

function StepFreight({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">What are you shipping?</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Equipment">
          <select className="input" value={form.equipmentType} onChange={(e) => setForm({ ...form, equipmentType: e.target.value })}>
            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{EQUIPMENT_LABEL[t]}</option>)}
          </select>
        </Field>
        <Field label="Weight (lbs)">
          <input
            type="number"
            className="input mono"
            value={form.weight}
            onChange={(e) => setForm({ ...form, weight: e.target.value === "" ? "" : Number(e.target.value) })}
          />
        </Field>
        <Field label="Frequency" className="md:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(["spot", "weekly", "monthly", "dedicated"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setForm({ ...form, frequency: f })}
                className={`rounded-full border px-4 py-2 mono text-xs uppercase tracking-wider transition ${
                  form.frequency === f
                    ? "border-accent bg-accent text-black"
                    : "border-white/[0.07] bg-white/[0.04] text-white/80 hover:border-white/[0.14]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </>
  );
}

function StepSchedule({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Pickup window</h1>
      <p className="font-body text-sm text-muted">Optional — leaves blank for ASAP.</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Preferred pickup">
          <input
            type="datetime-local"
            className="input"
            value={form.pickupAt}
            onChange={(e) => setForm({ ...form, pickupAt: e.target.value })}
          />
        </Field>
        <Field label="Special requirements" className="md:col-span-2">
          <textarea
            rows={3}
            className="input"
            value={form.specialRequirements}
            onChange={(e) => setForm({ ...form, specialRequirements: e.target.value })}
            placeholder="Hazmat, team driver, liftgate, dock-level only…"
          />
        </Field>
      </div>
    </>
  );
}

function StepContact({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Where should we send your quote?</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Company name">
          <input className="input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        </Field>
        <Field label="Contact name">
          <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        </Field>
        <Field label="Email">
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
      </div>
    </>
  );
}

function ResultScreen({ result }: { result: QuoteResult | undefined }) {
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/12 text-3xl text-accent">✦</div>
      <h2 className="mt-6 font-display text-2xl font-extrabold tracking-tight">Capacity request received</h2>
      {result?.estimatedRate != null && (
        <div className="mt-4 rounded-panel border border-accent/30 bg-accent/[0.06] p-5">
          <div className="mono text-[11px] uppercase tracking-wider text-muted">Estimated rate</div>
          <div className="kpi-number mt-1 text-4xl text-accent">
            {formatMoneyDecimal(result.estimatedRate)}
          </div>
          {result.rationale && (
            <p className="mt-3 font-body text-sm italic text-white/80">&ldquo;{result.rationale}&rdquo;</p>
          )}
        </div>
      )}
      <p className="mt-5 font-body text-sm text-muted">
        {result?.message ?? "An agent will contact you within 2 hours."}
      </p>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block mono text-[11px] uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}
