// 7 pain points sourced from ATRI's 2025 Top Industry Issues report (paraphrased).
const PAIN_POINTS = [
  "Insurance costs up 18% YoY",
  "Double-brokering is the #1 fraud vector",
  "Driver shortage projected at 64,000 in 2025",
  "Lawsuit abuse driving nuclear verdicts",
  "Diesel fuel volatility eating margins",
  "Detention without pay still industry-wide",
  "DAT spot rates compressing broker margin to 8-12%",
];

export function Ticker() {
  const items = [...PAIN_POINTS, ...PAIN_POINTS]; // duplicated for seamless loop

  return (
    <section className="border-y border-white/[0.07] bg-deep py-4 overflow-hidden">
      <div className="ticker-track">
        {items.map((point, i) => (
          <div key={i} className="flex shrink-0 items-center gap-3 px-8">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-orange/12 text-orange" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01M10.29 3.86l-8.36 14.34a2 2 0 0 0 1.71 3h16.72a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </span>
            <span className="mono text-sm text-white/80">{point}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
