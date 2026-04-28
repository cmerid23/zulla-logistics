import { AnimatedSection } from "./AnimatedSection";

const STEPS = [
  { title: "Shipper Posts Load",       body: "Drop pickup + drop. Our AI suggests fair rates instantly. One click to publish." },
  { title: "Carrier Books Instantly", body: "Verified carriers browse the private board, swipe to book, sign rate-con with 2FA." },
  { title: "Track & Document",        body: "GPS pings every 15 minutes. BOL on pickup, POD on delivery — everything in R2." },
  { title: "Pay & Get Paid",          body: "Stripe collects from shipper. Carrier paid in 72 hours. Agent commission auto-allocated." },
];

export function HowItWorks() {
  return (
    <section className="bg-black py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <AnimatedSection>
          <div className="section-label mb-3">How it works</div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Four steps. Zero spreadsheets.
          </h2>
        </AnimatedSection>

        <div className="relative mt-16">
          <div
            className="absolute left-0 right-0 top-9 hidden h-px bg-white/10 md:block"
            aria-hidden
          />
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-6">
            {STEPS.map((s, i) => (
              <AnimatedSection key={s.title} delay={i * 0.08}>
                <div className="relative text-center md:text-left">
                  <div className="relative mx-auto h-[72px] w-[72px] md:mx-0">
                    <div className="absolute inset-0 rounded-full bg-accent/12 blur-md" />
                    <div className="relative grid h-full w-full place-items-center rounded-full border border-accent/40 bg-black font-display text-2xl font-extrabold text-accent">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  </div>
                  <h3 className="mt-6 font-display text-xl font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-2 font-body text-sm text-muted">{s.body}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
