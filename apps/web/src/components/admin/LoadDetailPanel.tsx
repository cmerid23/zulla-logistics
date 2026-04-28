import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LOAD_STATUSES,
  type Carrier,
  type Load,
  type LoadStatus,
} from "@zulla/shared";
import { api } from "../../lib/api";
import { SlidePanel } from "./SlidePanel";
import { Badge } from "../ui/Badge";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

interface Props {
  load: Load | null;
  onClose: () => void;
}

interface DatPostResponse {
  load: Load;
  datStatus: string;
  inquiries: Array<{ carrierName: string; mc: string; offerCents?: number }>;
}

export function LoadDetailPanel({ load, onClose }: Props) {
  return (
    <SlidePanel
      open={Boolean(load)}
      onClose={onClose}
      title={load ? load.referenceNumber ?? load.id.slice(0, 8) : ""}
    >
      {load && <Body load={load} />}
    </SlidePanel>
  );
}

function Body({ load }: { load: Load }) {
  const qc = useQueryClient();
  const [carrierSearch, setCarrierSearch] = useState("");
  const [forcedStatus, setForcedStatus] = useState<LoadStatus>(load.status);
  const [note, setNote] = useState(load.internalNotes ?? "");
  const [datResult, setDatResult] = useState<DatPostResponse | null>(null);

  const carriersQuery = useQuery({
    queryKey: ["admin", "carriers"],
    queryFn: () => api.get<Carrier[]>("/carriers"),
  });
  const carriers = (carriersQuery.data ?? []).filter(
    (c) =>
      c.onboardingComplete &&
      !c.doNotUse &&
      ((c.mcNumber ?? "").toLowerCase().includes(carrierSearch.toLowerCase()) ||
        (c.dotNumber ?? "").includes(carrierSearch)),
  );

  const reassign = useMutation({
    mutationFn: (carrierId: string) =>
      api.patch<Load>(`/admin/loads/${load.id}/reassign`, { carrierId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "loads"] }),
  });

  const forceStatus = useMutation({
    mutationFn: (status: LoadStatus) =>
      api.patch<Load>(`/admin/loads/${load.id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "loads"] }),
  });

  const saveNote = useMutation({
    mutationFn: () => api.patch<Load>(`/admin/loads/${load.id}/note`, { note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "loads"] }),
  });

  const postDat = useMutation({
    mutationFn: () => api.post<DatPostResponse>(`/admin/loads/${load.id}/post-dat`),
    onSuccess: (data) => {
      setDatResult(data);
      qc.invalidateQueries({ queryKey: ["admin", "loads"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div>
        <div className="font-display text-xl font-extrabold tracking-tight">
          {load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 mono text-[11px] uppercase tracking-wider text-muted">
          <Badge tone="info">{load.status.replace("_", " ")}</Badge>
          <span>{load.equipmentType}</span>
          <span>· {load.distanceMiles ?? "—"} mi</span>
          <span>· Pickup {formatDate(load.pickupDate)}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <Stat label="Shipper rate" value={formatMoneyDecimal(load.shipperRate)} tone="green" />
          <Stat label="Carrier rate" value={formatMoneyDecimal(load.carrierRate)} />
          <Stat label="Margin" value={`${formatMoneyDecimal(load.brokerMargin)} (${load.brokerMarginPct ?? "—"}%)`} tone="accent" />
        </div>
      </div>

      {/* Reassign carrier */}
      <Section title="Reassign carrier">
        <input
          className="input"
          placeholder="Search by MC or DOT…"
          value={carrierSearch}
          onChange={(e) => setCarrierSearch(e.target.value)}
        />
        <div className="mt-2 max-h-48 overflow-y-auto rounded-btn border border-white/[0.07] bg-deep">
          {carriers.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted">No matching carriers.</div>
          )}
          {carriers.slice(0, 25).map((c) => (
            <button
              key={c.id}
              onClick={() => reassign.mutate(c.id)}
              disabled={reassign.isPending}
              className={`flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-white/[0.04] ${
                load.carrierId === c.id ? "bg-accent/8" : ""
              }`}
            >
              <span className="mono text-sm">MC {c.mcNumber ?? "—"} · DOT {c.dotNumber ?? "—"}</span>
              {load.carrierId === c.id && <span className="mono text-[10px] text-accent">CURRENT</span>}
            </button>
          ))}
        </div>
        {reassign.isSuccess && <div className="mt-2 text-xs text-green">Carrier reassigned.</div>}
      </Section>

      {/* Force status */}
      <Section title="Force status change">
        <div className="flex gap-2">
          <select
            className="input flex-1"
            value={forcedStatus}
            onChange={(e) => setForcedStatus(e.target.value as LoadStatus)}
          >
            {LOAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => forceStatus.mutate(forcedStatus)}
            disabled={forceStatus.isPending || forcedStatus === load.status}
            className="btn-accent btn-sm"
          >
            Apply
          </button>
        </div>
      </Section>

      {/* Internal note */}
      <Section title="Internal note">
        <textarea
          className="input"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notes visible to brokerage staff only…"
        />
        <div className="mt-2 flex justify-end">
          <button onClick={() => saveNote.mutate()} disabled={saveNote.isPending} className="btn-accent btn-sm">
            {saveNote.isPending ? "Saving…" : "Save note"}
          </button>
        </div>
      </Section>

      {/* DAT post */}
      <Section title="DAT One overflow">
        <div className="flex items-center justify-between">
          <div className="font-body text-sm">
            {load.datPosted ? (
              <span className="text-green">Posted to DAT · ID {load.datPostingId}</span>
            ) : (
              <span className="text-muted">Not posted</span>
            )}
          </div>
          <button
            onClick={() => postDat.mutate()}
            disabled={postDat.isPending || load.datPosted}
            className="btn-orange btn-sm"
          >
            {load.datPosted ? "Already posted" : postDat.isPending ? "Posting…" : "Post to DAT"}
          </button>
        </div>
        {(datResult?.inquiries?.length ?? 0) > 0 && (
          <div className="mt-3 space-y-1">
            <div className="mono text-[10px] uppercase tracking-wider text-muted">Inquiries</div>
            {datResult!.inquiries.map((inq) => (
              <div key={inq.mc} className="flex justify-between font-body text-sm">
                <span>{inq.carrierName} · MC {inq.mc}</span>
                <span className="mono text-green">
                  {inq.offerCents ? formatMoneyDecimal(inq.offerCents / 100) : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "accent" }) {
  const color = tone === "green" ? "text-green" : tone === "accent" ? "text-accent" : "text-white";
  return (
    <div className="rounded-btn border border-white/[0.07] bg-deep p-3">
      <div className="mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`font-display text-base font-bold ${color}`}>{value}</div>
    </div>
  );
}
