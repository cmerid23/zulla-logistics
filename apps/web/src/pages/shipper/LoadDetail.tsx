import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DocumentRecord, Invoice, Load, TrackingEvent } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { TrackingMap } from "../../components/maps/TrackingMap";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

type Tab = "overview" | "documents" | "invoice" | "tracking";

const TIMELINE: Array<Load["status"]> = [
  "draft",
  "posted",
  "booked",
  "in_transit",
  "delivered",
  "invoiced",
  "paid",
];

export function ShipperLoadDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || "overview";
  const [tab, setTab] = useState<Tab>(initialTab);

  const loadQuery = useQuery({
    queryKey: ["load", id],
    queryFn: () => api.get<Load>(`/loads/${id}`),
    enabled: Boolean(id),
  });
  const load = loadQuery.data;

  if (!load) {
    return <div className="px-4 py-12 text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mono text-[11px] uppercase tracking-wider text-muted">
            {load.referenceNumber ?? load.id.slice(0, 8)}
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            {load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}
          </h1>
        </div>
        <Badge tone="info" className="!px-3 !py-1.5 !text-sm">{load.status.replace("_", " ")}</Badge>
      </div>

      <div className="flex gap-1 border-b border-white/[0.07]">
        {(["overview", "documents", "invoice", "tracking"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`mono px-4 py-2 text-[11px] uppercase tracking-wider transition ${
              tab === t ? "text-white border-b-2 border-accent" : "text-muted hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview"  && <Overview load={load} />}
      {tab === "documents" && <Documents loadId={load.id} />}
      {tab === "invoice"   && <InvoiceTab loadId={load.id} />}
      {tab === "tracking"  && <Tracking loadId={load.id} />}
    </div>
  );
}

function Overview({ load }: { load: Load }) {
  const carrierQuery = useQuery({
    queryKey: ["carrier", load.carrierId],
    queryFn: () => api.get(`/carriers/${load.carrierId}`),
    enabled: Boolean(load.carrierId),
  });

  const idx = TIMELINE.indexOf(load.status as never);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader className="border-white/[0.07]">
          <span className="font-display text-base font-bold">Status timeline</span>
        </CardHeader>
        <CardBody className="space-y-3">
          {TIMELINE.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[10px] ${
                  i <= idx ? "bg-accent text-black" : "bg-white/[0.07] text-muted"
                }`}
              >
                {i + 1}
              </span>
              <span className={`mono text-xs uppercase tracking-wider ${i <= idx ? "text-white" : "text-muted"}`}>
                {s.replace("_", " ")}
              </span>
            </div>
          ))}
        </CardBody>
      </Card>
      <Card>
        <CardHeader className="border-white/[0.07]">
          <span className="font-display text-base font-bold">Carrier</span>
        </CardHeader>
        <CardBody className="space-y-2 font-body text-sm">
          {carrierQuery.data ? (
            <>
              <div className="font-display text-base font-bold">
                MC {(carrierQuery.data as { mcNumber?: string }).mcNumber ?? "—"}
              </div>
              <div className="mono text-xs text-muted">
                {(carrierQuery.data as { authorityStatus?: string }).authorityStatus ?? "—"}
              </div>
              <Badge tone="success" className="mt-2">Verified</Badge>
            </>
          ) : (
            <div className="text-muted">No carrier assigned yet.</div>
          )}
          <div className="my-3 h-px bg-white/[0.07]" />
          <div className="mono text-[11px] uppercase tracking-wider text-muted">Equipment</div>
          <div>{load.equipmentType}</div>
          <div className="mono text-[11px] uppercase tracking-wider text-muted mt-2">Pickup</div>
          <div>{formatDate(load.pickupDate)}</div>
          <div className="mono text-[11px] uppercase tracking-wider text-muted mt-2">Amount</div>
          <div className="font-display text-xl font-bold text-green">{formatMoneyDecimal(load.shipperRate)}</div>
        </CardBody>
      </Card>
    </div>
  );
}

function Documents({ loadId }: { loadId: string }) {
  const docsQuery = useQuery({
    queryKey: ["docs", loadId],
    queryFn: () =>
      api
        .get<DocumentRecord[]>(`/documents/by-load/${loadId}`)
        .catch(() => [] as DocumentRecord[]),
  });

  async function download(id: string) {
    const { url } = await api.get<{ url: string }>(`/documents/${id}/url`);
    window.open(url, "_blank");
  }

  const docs = docsQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="border-white/[0.07]">
        <span className="font-display text-base font-bold">Documents</span>
      </CardHeader>
      <CardBody className="divide-y divide-white/[0.04]">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between py-3">
            <div>
              <div className="font-display text-sm font-bold">{d.filename}</div>
              <div className="mono text-[10px] uppercase tracking-wider text-muted">
                {d.type} · {formatDate(d.uploadedAt)}
              </div>
            </div>
            <button onClick={() => download(d.id)} className="btn-ghost btn-sm">Download</button>
          </div>
        ))}
        {docs.length === 0 && (
          <div className="py-6 text-center text-sm text-muted">No documents yet.</div>
        )}
      </CardBody>
    </Card>
  );
}

function InvoiceTab({ loadId }: { loadId: string }) {
  const qc = useQueryClient();
  const invoiceQuery = useQuery({
    queryKey: ["invoice", "by-load", loadId],
    queryFn: () =>
      api
        .get<Invoice[]>("/invoices/me")
        .then((all) => all.find((i) => i.loadId === loadId) ?? null),
  });
  const inv = invoiceQuery.data;

  // Shipper-initiated payment via Stripe Payment Element. Server returns the
  // PaymentIntent client_secret; in production we'd hand that to <PaymentElement />.
  const pay = useMutation({
    mutationFn: () => api.post<{ clientSecret: string; paymentIntentId: string }>(`/invoices/${inv!.id}/pay`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice", "by-load", loadId] }),
  });

  if (!inv) {
    return (
      <Card>
        <CardBody className="text-sm text-muted">Invoice will appear after delivery.</CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-white/[0.07] flex items-center justify-between">
        <span className="font-display text-base font-bold">{inv.invoiceNumber}</span>
        <Badge tone={inv.status === "paid" ? "success" : "info"}>{inv.status.replace("_", " ")}</Badge>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-2 gap-y-3 font-body text-sm">
          <div className="text-muted">Issued</div>
          <div className="text-right mono">{formatDate(inv.issuedAt)}</div>
          <div className="text-muted">Due</div>
          <div className="text-right mono">{formatDate(inv.dueAt)}</div>
          <div className="text-muted">Amount</div>
          <div className="text-right font-display text-lg font-bold">{formatMoneyDecimal(inv.amount)}</div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {(inv.status === "pending" || inv.status === "approved") && (
            <button onClick={() => pay.mutate()} disabled={pay.isPending} className="btn-accent">
              {pay.isPending ? "Starting payment…" : "Approve & Pay"}
            </button>
          )}
        </div>
        {pay.data?.clientSecret && (
          <div className="mt-3 rounded-btn border border-accent/30 bg-accent/[0.06] p-3 mono text-xs text-accent">
            Payment intent created. The Stripe Payment Element would mount here using clientSecret.
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Tracking({ loadId }: { loadId: string }) {
  const eventsQuery = useQuery({
    queryKey: ["tracking", loadId],
    queryFn: () =>
      api.get<{ loadId: string; events: TrackingEvent[] }>(`/tracking/loads/${loadId}`),
    refetchInterval: 30_000,
  });

  const events = eventsQuery.data?.events ?? [];
  const pings = events
    .filter((e) => e.latitude != null && e.longitude != null)
    .map((e) => ({ lat: Number(e.latitude), lng: Number(e.longitude), pingedAt: e.timestamp }));

  return (
    <Card>
      <CardHeader className="border-white/[0.07]">
        <span className="font-display text-base font-bold">Live tracking</span>
      </CardHeader>
      <CardBody className="space-y-4">
        <TrackingMap pings={pings} />
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 mono text-xs text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-muted">{formatDate(e.timestamp)}</span>
              <span>{e.statusUpdate ?? "Position update"}</span>
            </div>
          ))}
          {events.length === 0 && <div className="text-sm text-muted">No tracking events yet.</div>}
        </div>
      </CardBody>
    </Card>
  );
}
