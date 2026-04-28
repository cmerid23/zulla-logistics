import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DQ_DOCUMENT_LABEL, type Driver, type DqDocumentType, type Truck } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatDate } from "../../lib/utils";

interface DqStatusResponse {
  driverId: string;
  missing: DqDocumentType[];
  expired: DqDocumentType[];
  expiringSoon: DqDocumentType[];
  complete: boolean;
}

function within30(date?: string | null): boolean {
  if (!date) return false;
  const ms = new Date(date).getTime() - Date.now();
  return ms < 30 * 24 * 60 * 60 * 1000;
}

function isPast(date?: string | null): boolean {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
}

export function CarrierCompliance() {
  const driversQuery = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.get<Driver[]>("/drivers"),
  });
  const trucksQuery = useQuery({
    queryKey: ["trucks"],
    queryFn: () => api.get<Truck[]>("/trucks"),
  });

  const drivers = driversQuery.data ?? [];
  const trucks = trucksQuery.data ?? [];

  // CDL/medical card alerts (driver level)
  const driverAlerts = drivers.flatMap((d) => {
    const out: Array<{ id: string; name: string; label: string; date: string | null; tone: "danger" | "warning" }> = [];
    if (isPast(d.cdlExpiry)) out.push({ id: d.id, name: d.name, label: "CDL expired", date: d.cdlExpiry ?? null, tone: "danger" });
    else if (within30(d.cdlExpiry)) out.push({ id: d.id, name: d.name, label: "CDL expires soon", date: d.cdlExpiry ?? null, tone: "warning" });
    if (isPast(d.medicalCardExpiry)) out.push({ id: d.id, name: d.name, label: "Medical card expired", date: d.medicalCardExpiry ?? null, tone: "danger" });
    else if (within30(d.medicalCardExpiry)) out.push({ id: d.id, name: d.name, label: "Medical card expires soon", date: d.medicalCardExpiry ?? null, tone: "warning" });
    return out;
  });

  const truckAlerts = trucks.flatMap((t) => {
    const out: Array<{ id: string; unit: string; label: string; date: string | null; tone: "danger" | "warning" }> = [];
    if (isPast(t.insuranceExpiry)) out.push({ id: t.id, unit: t.unitNumber ?? t.id.slice(0, 6), label: "Insurance expired", date: t.insuranceExpiry ?? null, tone: "danger" });
    else if (within30(t.insuranceExpiry)) out.push({ id: t.id, unit: t.unitNumber ?? t.id.slice(0, 6), label: "Insurance expires soon", date: t.insuranceExpiry ?? null, tone: "warning" });
    if (isPast(t.registrationExpiry)) out.push({ id: t.id, unit: t.unitNumber ?? t.id.slice(0, 6), label: "Registration expired", date: t.registrationExpiry ?? null, tone: "danger" });
    else if (within30(t.registrationExpiry)) out.push({ id: t.id, unit: t.unitNumber ?? t.id.slice(0, 6), label: "Registration expires soon", date: t.registrationExpiry ?? null, tone: "warning" });
    return out;
  });

  const totalAlerts = driverAlerts.length + truckAlerts.length;

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Compliance</h1>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Kpi label="Drivers" value={String(drivers.length)} />
        <Kpi label="Trucks" value={String(trucks.length)} />
        <Kpi label="Open alerts" value={String(totalAlerts)} tone={totalAlerts > 0 ? "orange" : undefined} />
      </div>

      <Card>
        <CardHeader className="border-white/[0.07]">
          <span className="font-display text-base font-bold">Driver alerts</span>
        </CardHeader>
        <CardBody className="divide-y divide-white/[0.04]">
          {driverAlerts.map((a, i) => (
            <div key={`${a.id}-${i}`} className="flex items-center justify-between py-3">
              <div>
                <Link to={`/carrier/drivers/${a.id}`} className="font-display font-bold hover:text-accent">
                  {a.name}
                </Link>
                <div className="mono text-[10px] uppercase tracking-wider text-muted">{a.label}</div>
              </div>
              <div className="text-right">
                <Badge tone={a.tone}>{a.tone === "danger" ? "EXPIRED" : "EXPIRING"}</Badge>
                <div className="mono text-xs text-muted">{formatDate(a.date)}</div>
              </div>
            </div>
          ))}
          {driverAlerts.length === 0 && (
            <div className="py-6 text-center text-sm text-muted">No driver alerts. Nice.</div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="border-white/[0.07]">
          <span className="font-display text-base font-bold">Truck alerts</span>
        </CardHeader>
        <CardBody className="divide-y divide-white/[0.04]">
          {truckAlerts.map((a, i) => (
            <div key={`${a.id}-${i}`} className="flex items-center justify-between py-3">
              <div>
                <div className="font-display font-bold">Unit {a.unit}</div>
                <div className="mono text-[10px] uppercase tracking-wider text-muted">{a.label}</div>
              </div>
              <div className="text-right">
                <Badge tone={a.tone}>{a.tone === "danger" ? "EXPIRED" : "EXPIRING"}</Badge>
                <div className="mono text-xs text-muted">{formatDate(a.date)}</div>
              </div>
            </div>
          ))}
          {truckAlerts.length === 0 && (
            <div className="py-6 text-center text-sm text-muted">No truck alerts.</div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="border-white/[0.07]">
          <span className="font-display text-base font-bold">DQ files (per driver)</span>
        </CardHeader>
        <CardBody className="divide-y divide-white/[0.04]">
          {drivers.map((d) => (
            <DriverDqRow key={d.id} driver={d} />
          ))}
          {drivers.length === 0 && (
            <div className="py-6 text-center text-sm text-muted">No drivers yet.</div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function DriverDqRow({ driver }: { driver: Driver }) {
  const { data } = useQuery({
    queryKey: ["dq", driver.id],
    queryFn: () => api.get<DqStatusResponse>(`/dq/${driver.id}`),
  });

  return (
    <Link
      to={`/carrier/drivers/${driver.id}`}
      className="flex items-center justify-between py-3 hover:bg-white/[0.02]"
    >
      <div>
        <div className="font-display font-bold">{driver.name}</div>
        <div className="mono text-[10px] uppercase tracking-wider text-muted">
          {data
            ? `${data.missing.length} missing · ${data.expired.length} expired · ${data.expiringSoon.length} expiring`
            : "Loading…"}
        </div>
      </div>
      {data && (
        <Badge tone={data.complete ? "success" : data.expired.length > 0 ? "danger" : "warning"}>
          {data.complete ? "Complete" : `${data.missing.length + data.expired.length} issues`}
        </Badge>
      )}
    </Link>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "orange" }) {
  const color = tone === "orange" ? "text-orange" : "text-white";
  return (
    <Card>
      <CardBody>
        <div className="mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
        <div className={`kpi-number mt-1 text-3xl ${color}`}>{value}</div>
      </CardBody>
    </Card>
  );
}
