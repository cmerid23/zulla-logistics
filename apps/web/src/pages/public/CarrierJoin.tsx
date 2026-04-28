import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MarketingNav } from "../../components/marketing/MarketingNav";
import { Footer } from "../../components/marketing/Footer";
import { ProgressBar } from "../../components/onboarding/ProgressBar";
import { Step1Company, type Step1Data } from "../../components/onboarding/Step1Company";
import { Step2Equipment, type Step2Data } from "../../components/onboarding/Step2Equipment";
import { Step3Documents, type Step3Data } from "../../components/onboarding/Step3Documents";
import { Step4FMCSA } from "../../components/onboarding/Step4FMCSA";
import { Step5Payment, type Step5Data } from "../../components/onboarding/Step5Payment";
import { Step6Account, type Step6Data } from "../../components/onboarding/Step6Account";
import { api } from "../../lib/api";

interface CarrierRegisterResponse {
  autoApprove: boolean;
  flags: string[];
  carrierId: string;
  userId: string;
}

const STEP_LABELS = [
  "Company",
  "Equipment & Lanes",
  "Documents",
  "FMCSA",
  "Payment",
  "Account",
] as const;

export interface CarrierApplicationDraft {
  step1?: Step1Data;
  step2?: Step2Data;
  step3?: Step3Data;
  step5?: Step5Data;
  step6?: Step6Data;
}

export function CarrierJoin() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CarrierApplicationDraft>({});
  const [direction, setDirection] = useState<1 | -1>(1);

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  const submit = useMutation({
    mutationFn: () => {
      const s1 = draft.step1!;
      const s2 = draft.step2!;
      const s5 = draft.step5!;
      const s6 = draft.step6!;
      return api.post<CarrierRegisterResponse>("/auth/register/carrier", {
        email: s6.email,
        password: s6.password,
        companyName: s1.companyName,
        contactName: s1.contactName,
        phone: s1.phone,
        yearsInBusiness: s1.yearsInBusiness,
        numberOfTrucks: s1.numberOfTrucks,
        onboarding: {
          mcNumber: s1.mcNumber,
          dotNumber: s1.dotNumber,
          equipmentTypes: s2.equipmentTypes,
          preferredOriginStates: s2.preferOriginStates,
          preferredDestStates: s2.preferDestStates,
          factoringPartner: s5.method === "factoring" ? s5.factoringPartner : undefined,
          factoringAccount: s5.method === "factoring" ? s5.factoringAccount : undefined,
          bankRouting: s5.method === "ach" ? s5.bankRouting : undefined,
          bankAccount: s5.method === "ach" ? s5.bankAccount : undefined,
          onboardingStep: 6,
          onboardingComplete: true,
        },
      });
    },
  });

  function handleStep1(data: Step1Data) {
    setDraft((d) => ({ ...d, step1: data }));
    go(1);
  }
  function handleStep2(data: Step2Data) {
    setDraft((d) => ({ ...d, step2: data }));
    go(2);
  }
  function handleStep3(data: Step3Data) {
    setDraft((d) => ({ ...d, step3: data }));
    go(3);
  }
  function handleStep4Done() {
    go(4);
  }
  function handleStep5(data: Step5Data) {
    setDraft((d) => ({ ...d, step5: data }));
    go(5);
  }
  function handleStep6(data: Step6Data) {
    setDraft((d) => ({ ...d, step6: data }));
    submit.mutate(undefined, {
      onSuccess: () => go(6),
    });
  }

  const current = (() => {
    switch (step) {
      case 0: return <Step1Company onNext={handleStep1} initial={draft.step1} />;
      case 1: return <Step2Equipment onNext={handleStep2} onBack={() => go(0)} initial={draft.step2} />;
      case 2: return <Step3Documents onNext={handleStep3} onBack={() => go(1)} initial={draft.step3} />;
      case 3: return <Step4FMCSA mc={draft.step1?.mcNumber} dot={draft.step1?.dotNumber} onNext={handleStep4Done} onBack={() => go(2)} />;
      case 4: return <Step5Payment onNext={handleStep5} onBack={() => go(3)} initial={draft.step5} />;
      case 5: return <Step6Account onSubmit={handleStep6} onBack={() => go(4)} pending={submit.isPending} error={submit.error?.message} />;
      case 6: return <CompletionScreen result={submit.data} onContinue={() => navigate("/login")} />;
      default: return null;
    }
  })();

  return (
    <div className="min-h-screen bg-black">
      <MarketingNav />
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-20">
        {step < STEP_LABELS.length && (
          <>
            <div className="mono mb-3 text-[11px] uppercase tracking-wider text-muted">
              Step {step + 1} of {STEP_LABELS.length} · {STEP_LABELS[step]}
            </div>
            <ProgressBar value={(step / STEP_LABELS.length) * 100} />
            <div className="mt-10">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ x: direction * 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction * -40, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  {current}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
        {step >= STEP_LABELS.length && current}
      </main>
      <Footer />
    </div>
  );
}

function CompletionScreen({
  result,
  onContinue,
}: {
  result: CarrierRegisterResponse | undefined;
  onContinue: () => void;
}) {
  const approved = result?.autoApprove ?? false;
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <div
        className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl ${
          approved ? "bg-green/12 text-green" : "bg-orange/12 text-orange"
        }`}
      >
        {approved ? "✓" : "⏱"}
      </div>
      <h2 className="mt-6 font-display text-2xl font-extrabold tracking-tight">
        {approved ? "You're verified" : "Under review"}
      </h2>
      <p className="mt-2 font-body text-sm text-muted">
        {approved
          ? "Your authority is active and your COI checks out. Sign in and start finding loads."
          : "We received your application. Manual review usually takes about 2 hours. We'll email you the moment you're approved."}
      </p>
      {result?.flags?.length ? (
        <ul className="mt-4 space-y-1 mono text-xs text-orange">
          {result.flags.map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>
      ) : null}
      <button onClick={onContinue} className="btn-accent btn-lg mt-8 w-full">
        {approved ? "Start Finding Loads" : "Got it — sign in"}
      </button>
    </div>
  );
}
