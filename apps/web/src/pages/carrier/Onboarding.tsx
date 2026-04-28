import { OnboardingSteps } from "../../components/forms/OnboardingSteps";

export function CarrierOnboarding() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Carrier onboarding</h1>
        <p className="text-sm text-ink-600">
          Tell us about your authority so we can verify and start dispatching loads.
        </p>
      </div>
      <OnboardingSteps />
    </div>
  );
}
