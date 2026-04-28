import { Link } from "react-router-dom";
import { AnimatedSection } from "./AnimatedSection";

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-deep py-28">
      <div
        className="pointer-events-none absolute inset-x-0 -bottom-40 mx-auto h-[28rem] w-[28rem] rounded-full bg-accent/15 blur-3xl"
        aria-hidden
      />
      <AnimatedSection>
        <div className="relative mx-auto max-w-3xl px-4 text-center md:px-8">
          <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Move freight. <br />
            Get paid faster. <br />
            <span className="text-accent">Grow together.</span>
          </h2>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <Link to="/register" className="btn-accent btn-lg">Post Your First Load Free</Link>
            <Link to="/carrier/join" className="btn-ghost btn-lg">I&apos;m a Carrier →</Link>
            <Link to="/agents/apply" className="btn-orange btn-lg">Become an Agent</Link>
          </div>
          <p className="mt-6 mono text-[11px] uppercase tracking-wider text-muted">
            No contracts · No monthly fees · Cancel anytime
          </p>
        </div>
      </AnimatedSection>
    </section>
  );
}
