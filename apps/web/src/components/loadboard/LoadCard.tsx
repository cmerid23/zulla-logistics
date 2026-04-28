import type { Load } from "@zulla/shared";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";

interface Props {
  load: Load;
  onClick?: (load: Load) => void;
}

export function LoadCard({ load, onClick }: Props) {
  return (
    <Card
      className="cursor-pointer transition hover:border-brand-400"
      onClick={() => onClick?.(load)}
    >
      <CardHeader className="flex items-center justify-between">
        <div className="font-medium">{load.referenceNumber ?? load.id.slice(0, 8)}</div>
        <Badge tone="info">{load.equipmentType}</Badge>
      </CardHeader>
      <CardBody className="space-y-2 text-sm">
        <div>
          <span className="font-medium">
            {load.originCity}, {load.originState}
          </span>{" "}
          → <span className="font-medium">{load.destinationCity}, {load.destinationState}</span>
        </div>
        <div className="text-ink-600">
          Pickup {formatDate(load.pickupDate)} · {load.distanceMiles ?? "—"} mi
        </div>
        <div className="flex items-center justify-between">
          <Badge tone="neutral">{load.status}</Badge>
          <span className="font-semibold">{formatMoneyDecimal(load.shipperRate)}</span>
        </div>
      </CardBody>
    </Card>
  );
}
