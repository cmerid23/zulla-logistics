import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Carrier, Driver, Load, PaginatedResult, Truck } from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

interface AssignmentResponse {
  assignment: { id: string; loadId: string; assignedAt: string };
  driver: Driver | null;
  truck: Truck | null;
}

export function CarrierDispatch() {
  const carrierQuery = useQuery({
    queryKey: ["carrier", "me"],
    queryFn: () => api.get<Carrier | null>("/carriers/me"),
  });
  const carrierId = carrierQuery.data?.id;

  const loadsQuery = useQuery({
    queryKey: ["dispatch", "loads", carrierId],
    queryFn: () => api.get<PaginatedResult<Load>>("/loads", { query: { carrierId } }),
    enabled: Boolean(carrierId),
  });

  const items = (loadsQuery.data?.items ?? []).filter((l) =>
    ["booked", "in_transit"].includes(l.status),
  );
  const [target, setTarget] = useState<Load | null>(null);

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Dispatch board</h1>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-white/[0.07] text-sm">
            <thead className="bg-white/[0.02] text-left">
              <tr>
                {["Ref", "Lane", "Pickup", "Status", "Pay", "Assignment", ""].map((h) => (
                  <th key={h} className="px-3 py-3 mono text-[10px] uppercase tracking-wider text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {items.map((l) => (
                <DispatchRow key={l.id} load={l} onAssign={() => setTarget(l)} />
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-muted">No active loads to dispatch.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <AssignModal load={target} onClose={() => setTarget(null)} />
    </div>
  );
}

function DispatchRow({ load, onAssign }: { load: Load; onAssign: () => void }) {
  const { data } = useQuery({
    queryKey: ["assignment", load.id],
    queryFn: () => api.get<AssignmentResponse | null>(`/loads/${load.id}/assignment`),
  });

  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="px-3 py-3 mono text-xs">{load.referenceNumber ?? load.id.slice(0, 8)}</td>
      <td className="px-3 py-3">
        {load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}
      </td>
      <td className="px-3 py-3 mono text-xs">{formatDate(load.pickupDate)}</td>
      <td className="px-3 py-3"><Badge tone="info">{load.status.replace("_", " ")}</Badge></td>
      <td className="px-3 py-3 mono text-green">{formatMoneyDecimal(load.carrierRate)}</td>
      <td className="px-3 py-3 text-sm">
        {data?.driver ? (
          <>
            <div className="font-display font-bold">{data.driver.name}</div>
            <div className="mono text-[10px] uppercase tracking-wider text-muted">
              {data.truck?.unitNumber ?? "—"} {data.truck?.type ? `· ${data.truck.type}` : ""}
            </div>
          </>
        ) : (
          <span className="text-muted">Unassigned</span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <button onClick={onAssign} className="btn-accent btn-sm">
          {data?.driver ? "Reassign" : "Assign"}
        </button>
      </td>
    </tr>
  );
}

function AssignModal({ load, onClose }: { load: Load | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [driverId, setDriverId] = useState("");
  const [truckId, setTruckId] = useState("");

  const driversQuery = useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.get<Driver[]>("/drivers"),
    enabled: Boolean(load),
  });
  const trucksQuery = useQuery({
    queryKey: ["trucks"],
    queryFn: () => api.get<Truck[]>("/trucks"),
    enabled: Boolean(load),
  });

  const assign = useMutation({
    mutationFn: () => api.post(`/loads/${load!.id}/assign`, { driverId, truckId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignment", load!.id] });
      onClose();
    },
  });

  return (
    <Modal
      open={Boolean(load)}
      onClose={onClose}
      title="Assign driver + truck"
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => assign.mutate()} disabled={!driverId || !truckId || assign.isPending} className="btn-accent">
            {assign.isPending ? "Assigning…" : "Assign"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block mono text-[11px] uppercase tracking-wider text-muted">Driver</span>
          <select className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Select…</option>
            {(driversQuery.data ?? []).filter((d) => d.status === "active").map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block mono text-[11px] uppercase tracking-wider text-muted">Truck</span>
          <select className="input" value={truckId} onChange={(e) => setTruckId(e.target.value)}>
            <option value="">Select…</option>
            {(trucksQuery.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.unitNumber ?? t.id.slice(0, 6)} — {t.type ?? "?"}
              </option>
            ))}
          </select>
        </label>
        {assign.error && <div className="text-xs text-red-400">{(assign.error as Error).message}</div>}
      </div>
    </Modal>
  );
}
