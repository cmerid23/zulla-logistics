import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { TrackingMap } from "../../components/maps/TrackingMap";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { formatDate } from "../../lib/utils";

interface TrackingResponse {
  reference: string | null;
  status: string;
  origin: { city: string; state: string };
  destination: { city: string; state: string };
  pickupDate: string | null;
  deliveryDate: string | null;
  shipperCompany: string | null;
  events: Array<{
    id: string;
    latitude?: string | null;
    longitude?: string | null;
    statusUpdate?: string | null;
    timestamp: string;
  }>;
}

export function TrackPublic() {
  const { reference } = useParams();
  // Spec: GET /api/track/:token (the URL param is the trackingLinkToken).
  const { data, isLoading, error } = useQuery<TrackingResponse>({
    queryKey: ["tracking", reference],
    queryFn: () => api.get<TrackingResponse>(`/track/${reference}`),
    enabled: Boolean(reference),
    refetchInterval: 30_000,
  });

  const pings =
    data?.events
      .filter((e) => e.latitude != null && e.longitude != null)
      .map((e) => ({
        lat: Number(e.latitude),
        lng: Number(e.longitude),
        pingedAt: e.timestamp,
      })) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Card>
        <CardHeader className="font-semibold">
          Tracking — {data?.reference ?? reference}
        </CardHeader>
        <CardBody className="space-y-4">
          {isLoading && <div className="text-sm text-muted">Loading…</div>}
          {error && <div className="text-sm text-red-400">Could not load tracking.</div>}
          {data && (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted">Status:</span> {data.status}
                </div>
                <div>
                  <span className="text-muted">Route:</span>{" "}
                  {data.origin.city}, {data.origin.state} → {data.destination.city}, {data.destination.state}
                </div>
                <div>
                  <span className="text-muted">ETA:</span> {formatDate(data.deliveryDate)}
                </div>
                {data.shipperCompany && (
                  <div>
                    <span className="text-muted">Shipper:</span> {data.shipperCompany}
                  </div>
                )}
              </div>
              <TrackingMap pings={pings} />
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
