import type { Load } from "@zulla/shared";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

interface Props {
  loads: Load[];
  onSelect?: (load: Load) => void;
}

export function LoadTable({ loads, onSelect }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-100 bg-white shadow-card">
      <table className="min-w-full divide-y divide-ink-100 text-sm">
        <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-600">
          <tr>
            <th className="px-4 py-2">Ref</th>
            <th className="px-4 py-2">Origin → Dest</th>
            <th className="px-4 py-2">Equipment</th>
            <th className="px-4 py-2">Pickup</th>
            <th className="px-4 py-2">Miles</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2 text-right">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {loads.map((l) => (
            <tr
              key={l.id}
              className="cursor-pointer hover:bg-ink-50"
              onClick={() => onSelect?.(l)}
            >
              <td className="px-4 py-2 font-medium">{l.referenceNumber ?? l.id.slice(0, 8)}</td>
              <td className="px-4 py-2">
                {l.originCity}, {l.originState} → {l.destinationCity}, {l.destinationState}
              </td>
              <td className="px-4 py-2">{l.equipmentType}</td>
              <td className="px-4 py-2">{formatDate(l.pickupDate)}</td>
              <td className="px-4 py-2">{l.distanceMiles ?? "—"}</td>
              <td className="px-4 py-2">{l.status}</td>
              <td className="px-4 py-2 text-right font-semibold">
                {formatMoneyDecimal(l.shipperRate)}
              </td>
            </tr>
          ))}
          {!loads.length && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-ink-600">
                No loads match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
