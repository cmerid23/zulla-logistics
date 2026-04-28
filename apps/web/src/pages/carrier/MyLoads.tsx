import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Carrier, Load, PaginatedResult } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

const TIMELINE: Array<Load["status"]> = ["booked", "in_transit", "delivered"];

interface PresignResponse {
  key: string;
  uploadUrl: string;
  expiresIn: number;
}

export function CarrierMyLoads() {
  const qc = useQueryClient();

  const carrierQuery = useQuery({
    queryKey: ["carrier", "me"],
    queryFn: () => api.get<Carrier | null>("/carriers/me"),
  });
  const carrierId = carrierQuery.data?.id;

  const loadsQuery = useQuery({
    queryKey: ["loads", "mine", carrierId],
    queryFn: () => api.get<PaginatedResult<Load>>("/loads", { query: { carrierId } }),
    enabled: Boolean(carrierId),
  });

  const updateStatus = useMutation({
    mutationFn: (vars: { id: string; status: "in_transit" | "delivered" }) =>
      api.patch<Load>(`/loads/${vars.id}/status`, { status: vars.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loads", "mine"] }),
  });

  const tracking = useMutation({
    mutationFn: (vars: { id: string; latitude: number; longitude: number }) =>
      api.post(`/loads/${vars.id}/tracking`, vars),
  });

  async function uploadAndAdvance(
    load: Load,
    type: "BOL" | "POD",
    file: File,
    nextStatus: "in_transit" | "delivered",
  ) {
    const presign = await api.post<PresignResponse>("/documents/presign", {
      type,
      filename: file.name,
      contentType: file.type || "application/pdf",
      scope: "load",
    });
    await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/pdf" },
      body: file,
    });
    await api.post("/documents/record", {
      type,
      r2Key: presign.key,
      filename: file.name,
      fileSizeBytes: file.size,
      loadId: load.id,
    });
    await updateStatus.mutateAsync({ id: load.id, status: nextStatus });
  }

  async function checkIn(load: Load) {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        tracking.mutate({
          id: load.id,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => console.warn("[geo]", err),
    );
  }

  const items = loadsQuery.data?.items ?? [];

  return (
    <div className="space-y-4 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">My loads</h1>
      {!carrierId && <div className="text-sm text-muted">Loading…</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((l) => (
          <Card key={l.id} className="bg-surface">
            <CardHeader className="flex items-center justify-between border-white/[0.07]">
              <div>
                <div className="mono text-[11px] uppercase tracking-wider text-muted">
                  {l.referenceNumber ?? l.id.slice(0, 8)}
                </div>
                <div className="font-display text-base font-bold">
                  {l.originCity}, {l.originState} → {l.destinationCity}, {l.destinationState}
                </div>
              </div>
              <Badge tone="info">{l.status.replace("_", " ")}</Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              <Timeline status={l.status} />
              <div className="flex items-center justify-between mono text-xs text-muted">
                <span>Pickup {formatDate(l.pickupDate)}</span>
                <span className="text-green">{formatMoneyDecimal(l.shipperRate)}</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {l.status === "booked" && (
                  <UploadButton
                    label="Upload BOL"
                    accept="application/pdf,image/*"
                    onFile={(f) => uploadAndAdvance(l, "BOL", f, "in_transit")}
                  />
                )}
                {l.status === "in_transit" && (
                  <>
                    <UploadButton
                      label="Upload POD"
                      accept="application/pdf,image/*"
                      onFile={(f) => uploadAndAdvance(l, "POD", f, "delivered")}
                    />
                    <button onClick={() => checkIn(l)} className="btn-ghost btn-sm">
                      📍 Check in
                    </button>
                  </>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
        {!loadsQuery.isLoading && items.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted md:col-span-2">
            No active loads. Pick something up from the loadboard.
          </div>
        )}
      </div>
    </div>
  );
}

function Timeline({ status }: { status: Load["status"] }) {
  const idx = TIMELINE.indexOf(status as never);
  return (
    <div className="flex items-center gap-2">
      {TIMELINE.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${i <= idx ? "bg-accent" : "bg-white/[0.14]"}`}
          />
          <div
            className={`mono text-[10px] uppercase tracking-wider ${
              i <= idx ? "text-accent" : "text-muted"
            }`}
          >
            {s.replace("_", " ")}
          </div>
          {i < TIMELINE.length - 1 && (
            <div className={`h-px flex-1 ${i < idx ? "bg-accent" : "bg-white/[0.07]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function UploadButton({
  label,
  accept,
  onFile,
}: {
  label: string;
  accept: string;
  onFile: (f: File) => void;
}) {
  return (
    <label className="btn-accent btn-sm cursor-pointer">
      {label}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}
