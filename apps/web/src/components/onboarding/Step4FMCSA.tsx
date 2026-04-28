import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";

interface FmcsaSummary {
  authorityActive: boolean;
  authorityStatus: string | null;
  safetyRating: string | null;
  insuranceOnFile: boolean;
  outOfServicePct: number | null;
  daysSinceAuthority: number | null;
  flags: string[];
}

interface Props {
  mc?: string;
  dot?: string;
  onNext: () => void;
  onBack: () => void;
}

export function Step4FMCSA({ mc, dot, onNext, onBack }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["fmcsa", mc, dot],
    queryFn: () =>
      api.get<FmcsaSummary>("/carriers/verify-fmcsa", {
        query: { mc: mc?.replace(/^MC-?/i, ""), dot },
      }),
    enabled: Boolean(mc || dot),
    retry: 0,
  });

  const allGreen = data && data.authorityActive && data.insuranceOnFile && data.flags.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">FMCSA verification</h1>
        <p className="mt-1 font-body text-sm text-muted">
          Pulled live from SAFER. You can proceed even with warnings — those will be flagged for manual review.
        </p>
      </div>

      {isLoading && <SkeletonCard />}
      {error && (
        <div className="card border-red-500/40 bg-red-500/[0.06] p-5">
          <div className="font-display text-sm font-bold text-red-400">Lookup failed</div>
          <div className="mt-1 mono text-xs text-muted">{(error as Error).message}</div>
        </div>
      )}
      {data && (
        <div className="card p-6">
          {allGreen && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green/40 bg-green/[0.08] px-3 py-1 mono text-[11px] uppercase tracking-wider text-green">
              <span className="h-2 w-2 rounded-full bg-green" />
              Verified · all checks passed
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Stat
              label="Authority Status"
              value={data.authorityStatus ?? (data.authorityActive ? "ACTIVE" : "INACTIVE")}
              tone={data.authorityActive ? "green" : "red"}
            />
            <Stat
              label="Safety Rating"
              value={data.safetyRating ?? "Not Rated"}
              tone={data.safetyRating === "Satisfactory" ? "green" : "muted"}
            />
            <Stat
              label="Insurance on File (BOC-3)"
              value={data.insuranceOnFile ? "Yes" : "No"}
              tone={data.insuranceOnFile ? "green" : "red"}
            />
            <Stat
              label="Out-of-Service %"
              value={data.outOfServicePct == null ? "—" : `${data.outOfServicePct.toFixed(1)}%`}
              tone={data.outOfServicePct != null && data.outOfServicePct > 10 ? "red" : "muted"}
            />
            <Stat
              label="Days Since Authority"
              value={data.daysSinceAuthority == null ? "—" : `${data.daysSinceAuthority}`}
              tone={data.daysSinceAuthority != null && data.daysSinceAuthority < 90 ? "red" : "muted"}
            />
          </div>

          {data.flags.length > 0 && (
            <div className="mt-6 rounded-btn border border-orange/40 bg-orange/[0.08] p-4">
              <div className="font-display text-sm font-bold text-orange">Flags for review</div>
              <ul className="mt-2 space-y-1 mono text-xs text-orange">
                {data.flags.map((f) => <li key={f}>· {f}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} className="btn-ghost btn-lg">← Back</button>
        <button type="button" onClick={onNext} className="btn-accent btn-lg">Continue →</button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "muted";
}) {
  const color = tone === "green" ? "text-green" : tone === "red" ? "text-red-400" : "text-white";
  return (
    <div className="rounded-btn border border-white/[0.07] bg-deep p-4">
      <div className="mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 font-display text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse p-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-btn border border-white/[0.07] bg-deep p-4">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="mt-2 h-5 w-32 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
