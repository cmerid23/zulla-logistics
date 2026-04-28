import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Carrier, DocumentRecord } from "@zulla/shared";
import { api } from "../../lib/api";
import { SlidePanel } from "./SlidePanel";
import { ReasonModal } from "./ReasonModal";
import { Badge } from "../ui/Badge";
import { formatDate } from "../../lib/utils";

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
  carrier: Carrier | null;
  onClose: () => void;
}

export function CarrierDetailPanel({ carrier, onClose }: Props) {
  return (
    <SlidePanel
      open={Boolean(carrier)}
      onClose={onClose}
      title={carrier ? `MC ${carrier.mcNumber ?? "—"}` : ""}
    >
      {carrier && <Body carrier={carrier} onClose={onClose} />}
    </SlidePanel>
  );
}

function Body({ carrier, onClose }: { carrier: Carrier; onClose: () => void }) {
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [dnuOpen, setDnuOpen] = useState(false);

  const fmcsaQuery = useQuery({
    queryKey: ["fmcsa", carrier.mcNumber, carrier.dotNumber],
    queryFn: () =>
      api.get<FmcsaSummary>("/carriers/verify-fmcsa", {
        query: {
          mc: carrier.mcNumber?.replace(/^MC-?/i, ""),
          dot: carrier.dotNumber,
        },
      }),
    enabled: Boolean(carrier.mcNumber || carrier.dotNumber),
    retry: 0,
  });

  const docsQuery = useQuery({
    queryKey: ["carrier-docs", carrier.id],
    queryFn: () =>
      api
        .get<DocumentRecord[]>(`/documents/by-carrier/${carrier.id}`)
        .catch(() => [] as DocumentRecord[]),
  });

  async function downloadDoc(id: string) {
    const { url } = await api.get<{ url: string }>(`/documents/${id}/url`);
    window.open(url, "_blank");
  }

  const approve = useMutation({
    mutationFn: () => api.post<Carrier>(`/carriers/${carrier.id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "carriers"] });
      onClose();
    },
  });
  const reject = useMutation({
    mutationFn: (reason: string) => api.post(`/carriers/${carrier.id}/reject`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "carriers"] });
      setRejectOpen(false);
      onClose();
    },
  });
  const flagDnu = useMutation({
    mutationFn: (reason: string) => api.post(`/carriers/${carrier.id}/flag-dnu`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "carriers"] });
      setDnuOpen(false);
      onClose();
    },
  });

  const fmcsa = fmcsaQuery.data;
  const docs = docsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Badge tone={carrier.doNotUse ? "danger" : carrier.onboardingComplete ? "success" : "warning"}>
            {carrier.doNotUse ? "DNU" : carrier.onboardingComplete ? "Active" : "Pending"}
          </Badge>
          {carrier.highwayVerified && <Badge tone="info">Highway Verified</Badge>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="MC #" value={carrier.mcNumber ?? "—"} mono />
          <Stat label="DOT #" value={carrier.dotNumber ?? "—"} mono />
          <Stat label="Authority" value={carrier.authorityStatus ?? "—"} />
          <Stat label="Safety" value={carrier.safetyRating ?? "—"} />
          <Stat label="Insurance expiry" value={formatDate(carrier.insuranceExpiry)} />
          <Stat label="Onboarding step" value={String(carrier.onboardingStep ?? 1)} />
        </div>
        {carrier.doNotUse && carrier.doNotUseReason && (
          <div className="mt-3 rounded-btn border border-red-500/40 bg-red-500/[0.06] p-3">
            <div className="mono text-[10px] uppercase tracking-wider text-red-400">DNU reason</div>
            <div className="mt-1 font-body text-sm">{carrier.doNotUseReason}</div>
          </div>
        )}
      </div>

      <Section title="FMCSA verification">
        {fmcsaQuery.isLoading && <div className="text-sm text-muted">Loading…</div>}
        {fmcsa && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Authority" value={fmcsa.authorityActive ? "ACTIVE" : "INACTIVE"} tone={fmcsa.authorityActive ? "green" : "red"} />
            <Stat label="Insurance" value={fmcsa.insuranceOnFile ? "On file" : "Missing"} tone={fmcsa.insuranceOnFile ? "green" : "red"} />
            <Stat label="OOS %" value={fmcsa.outOfServicePct == null ? "—" : `${fmcsa.outOfServicePct.toFixed(1)}%`} tone={fmcsa.outOfServicePct != null && fmcsa.outOfServicePct > 10 ? "red" : undefined} />
            {fmcsa.flags.length > 0 && (
              <div className="md:col-span-3 rounded-btn border border-orange/40 bg-orange/[0.08] p-3 mono text-xs text-orange">
                {fmcsa.flags.join(" · ")}
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="Equipment & lanes">
        <div className="flex flex-wrap gap-1">
          {(carrier.equipmentTypes ?? []).map((e) => <span key={e} className="chip">{e}</span>)}
          {(carrier.equipmentTypes ?? []).length === 0 && <span className="text-sm text-muted">—</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 mono text-xs text-muted">
          <div>
            Origins: <span className="text-white">{(carrier.preferredOriginStates ?? []).join(", ") || "any"}</span>
          </div>
          <div>
            Dests: <span className="text-white">{(carrier.preferredDestStates ?? []).join(", ") || "any"}</span>
          </div>
        </div>
      </Section>

      <Section title="Payment method">
        <div className="font-body text-sm">
          {carrier.factoringPartner ? (
            <>
              Factoring · <span className="text-white">{carrier.factoringPartner}</span> · acct{" "}
              <span className="mono text-muted">{carrier.factoringAccount ?? "—"}</span>
            </>
          ) : (
            <span className="text-muted">Direct ACH (encrypted)</span>
          )}
        </div>
      </Section>

      <Section title="Documents">
        <div className="space-y-2">
          {docs.map((d) => (
            <button
              key={d.id}
              onClick={() => downloadDoc(d.id)}
              className="flex w-full items-center justify-between rounded-btn border border-white/[0.07] bg-deep px-3 py-2 text-left transition hover:border-white/[0.14]"
            >
              <div>
                <div className="font-display text-sm font-bold">{d.filename}</div>
                <div className="mono text-[10px] uppercase tracking-wider text-muted">
                  {d.type} · {formatDate(d.uploadedAt)}
                </div>
              </div>
              <span className="mono text-[11px] text-accent">Open ↗</span>
            </button>
          ))}
          {docs.length === 0 && <div className="text-sm text-muted">No documents on file.</div>}
        </div>
      </Section>

      <div className="flex flex-wrap gap-2 border-t border-white/[0.07] pt-5">
        <button
          onClick={() => approve.mutate()}
          disabled={approve.isPending}
          className="btn-accent"
        >
          Approve
        </button>
        <button onClick={() => setRejectOpen(true)} className="btn-ghost">Reject</button>
        <button onClick={() => setDnuOpen(true)} className="btn-danger">Flag DNU</button>
      </div>

      <ReasonModal
        open={rejectOpen}
        title="Reject carrier"
        ctaLabel="Reject"
        ctaTone="danger"
        onClose={() => setRejectOpen(false)}
        onConfirm={(r) => reject.mutate(r)}
        pending={reject.isPending}
      />
      <ReasonModal
        open={dnuOpen}
        title="Flag Do-Not-Use"
        ctaLabel="Flag DNU"
        ctaTone="danger"
        onClose={() => setDnuOpen(false)}
        onConfirm={(r) => flagDnu.mutate(r)}
        pending={flagDnu.isPending}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mono mb-2 text-[11px] uppercase tracking-wider text-muted">{title}</div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "green" | "red";
}) {
  const color = tone === "green" ? "text-green" : tone === "red" ? "text-red-400" : "text-white";
  return (
    <div className="rounded-btn border border-white/[0.07] bg-deep p-3">
      <div className="mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-1 ${mono ? "mono text-sm" : "font-body text-sm font-medium"} ${color}`}>{value}</div>
    </div>
  );
}
