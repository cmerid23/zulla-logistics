import { Link } from "react-router-dom";
import { AnimatedSection } from "./AnimatedSection";

const TRUST_STATS = [
  { value: "72-hr", label: "Carrier payment" },
  { value: "$0", label: "Carrier loadboard" },
  { value: "100%", label: "Highway-verified" },
  { value: "Live", label: "FMCSA monitoring" },
];

export function Hero() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
      <div className="absolute inset-0 bg-radial-accent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-black" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-24 text-center md:px-8">
        <AnimatedSection delay={0.05}>
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur">
            <span className="relative grid place-items-center">
              <span className="absolute h-2 w-2 rounded-full bg-green pulse-dot" />
              <span className="h-2 w-2 rounded-full bg-green" />
            </span>
            <span className="mono text-[11px] uppercase tracking-[0.2em] text-white/80">
              Now operating in Texas · Expanding nationwide
            </span>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <h1
            className="font-display font-extrabold leading-[0.95]"
            style={{
              fontSize: "clamp(52px, 7vw, 100px)",
              letterSpacing: "-3px",
            }}
          >
            <span className="block">Freight Brokerage</span>
            <span className="block text-accent">Without the</span>
            <span className="block">Friction.</span>
          </h1>
        </AnimatedSection>

        <AnimatedSection delay={0.3}>
          <p className="mx-auto mt-6 max-w-2xl font-body text-base text-white/70 md:text-lg">
            A modern broker platform — loadboard, carrier vetting, real-time tracking, invoicing,
            and AI rate insights — built for shippers, carriers, and agents who are tired of
            DAT-only ops.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.45}>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <Link to="/quote" className="btn-accent btn-lg">Get instant capacity quote</Link>
            <Link to="/carrier/join" className="btn-ghost btn-lg">I&apos;m a Carrier →</Link>
            <Link to="/agents/apply" className="btn-orange btn-lg">Become an Agent</Link>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.6}>
          <div className="mt-16 grid w-full max-w-3xl grid-cols-2 gap-6 md:grid-cols-4">
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="text-left">
                <div className="kpi-number text-3xl text-accent">{s.value}</div>
                <div className="mono mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
