import { Link } from "react-router-dom";

export function Logo({ subdued = false }: { subdued?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span
        className={`grid h-8 w-8 place-items-center rounded-btn ${subdued ? "bg-white/5" : "bg-accent"}`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className={`h-4 w-4 ${subdued ? "text-accent" : "text-black"}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h11l3 4h4v6H3z" />
          <circle cx="7" cy="17" r="2" fill="currentColor" />
          <circle cx="17" cy="17" r="2" fill="currentColor" />
        </svg>
      </span>
      <span className="font-display text-base font-bold tracking-tight">Zulla Logistics</span>
    </Link>
  );
}
