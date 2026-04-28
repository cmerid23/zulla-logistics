import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DQ_DOCUMENT_LABEL,
  DQ_DOCUMENT_TYPES,
  type Driver,
  type DqDocumentType,
} from "@zulla/shared";
import { api } from "../../lib/api";
import { Card, CardBody, CardHeader } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatDate } from "../../lib/utils";

interface DqStatusResponse {
  driverId: string;
  documents: Array<{
    type: DqDocumentType;
    onFile: boolean;
    expired: boolean;
    expiringSoon: boolean;
    record?: {
      id: string;
      filename: string;
      r2Key: string;
      expiryDate: string | null;
      uploadedAt: string;
      verifiedByAdmin: boolean;
    };
  }>;
  missing: DqDocumentType[];
  expired: DqDocumentType[];
  expiringSoon: DqDocumentType[];
  complete: boolean;
}

interface PresignResponse {
  key: string;
  uploadUrl: string;
}

export function CarrierDriverDetail() {
  const { id } = useParams();
  const qc = useQueryClient();

  const driverQuery = useQuery({
    queryKey: ["driver", id],
    queryFn: () => api.get<Driver>(`/drivers/${id}`),
    enabled: Boolean(id),
  });

  const dqQuery = useQuery({
    queryKey: ["dq", id],
    queryFn: () => api.get<DqStatusResponse>(`/dq/${id}`),
    enabled: Boolean(id),
  });

  async function uploadDoc(type: DqDocumentType, file: File, expiryIso?: string) {
    const presign = await api.post<PresignResponse>("/documents/presign", {
      type: "carrier_agreement", // generic doc type for the presign route's own validator
      filename: file.name,
      contentType: file.type || "application/pdf",
      scope: "carrier",
    });
    await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/pdf" },
      body: file,
    });
    await api.post(`/dq/${id}/documents`, {
      type,
      r2Key: presign.key,
      filename: file.name,
      expiryDate: expiryIso,
    });
    qc.invalidateQueries({ queryKey: ["dq", id] });
  }

  async function downloadDoc(docId: string) {
    const { url } = await api.get<{ url: string }>(`/documents/${docId}/url`);
    window.open(url, "_blank");
  }

  if (driverQuery.isLoading) {
    return <div className="px-4 py-12 text-sm text-muted">Loading…</div>;
  }
  const driver = driverQuery.data;
  const dq = dqQuery.data;
  if (!driver) return null;

  return (
    <div className="space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">{driver.name}</h1>
          <div className="mt-1 mono text-[11px] uppercase tracking-wider text-muted">
            CDL {driver.cdlNumber ?? "—"} {driver.cdlState ? `(${driver.cdlState})` : ""} · {driver.phone ?? "no phone"}
          </div>
        </div>
        <Badge tone={driver.status === "active" ? "success" : driver.status === "terminated" ? "danger" : "warning"}>
          {driver.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="CDL expiry" value={formatDate(driver.cdlExpiry)} />
        <Stat label="Medical card" value={formatDate(driver.medicalCardExpiry)} />
        <Stat label="Hire date" value={formatDate(driver.hireDate)} />
      </div>

      <Card>
        <CardHeader className="border-white/[0.07] flex items-center justify-between">
          <span className="font-display text-base font-bold">Driver Qualification File</span>
          {dq && (
            <Badge tone={dq.complete ? "success" : "warning"}>
              {dq.complete ? "Complete" : `${dq.missing.length} missing`}
            </Badge>
          )}
        </CardHeader>
        <CardBody className="divide-y divide-white/[0.04]">
          {DQ_DOCUMENT_TYPES.map((type) => {
            const slot = dq?.documents.find((d) => d.type === type);
            const tone = slot?.expired ? "danger" : slot?.expiringSoon ? "warning" : slot?.onFile ? "success" : "muted";
            return (
              <div key={type} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-display text-sm font-bold">{DQ_DOCUMENT_LABEL[type]}</div>
                  <div className="mono text-[10px] uppercase tracking-wider text-muted">
                    {slot?.record
                      ? `${slot.record.filename} · expires ${formatDate(slot.record.expiryDate)}`
                      : "Not on file"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {slot?.record && (
                    <>
                      <Badge tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "success" ? "success" : "neutral"}>
                        {slot.expired ? "expired" : slot.expiringSoon ? "expiring" : "ok"}
                      </Badge>
                      <button onClick={() => downloadDoc(slot.record!.id)} className="btn-ghost btn-sm">
                        Open
                      </button>
                    </>
                  )}
                  <UploadDocButton type={type} onFile={(f, exp) => uploadDoc(type, f, exp)} />
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <div className="mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
        <div className="mt-1 font-display text-lg font-bold">{value}</div>
      </CardBody>
    </Card>
  );
}

function UploadDocButton({
  type,
  onFile,
}: {
  type: DqDocumentType;
  onFile: (f: File, expiryIso?: string) => void;
}) {
  return (
    <label className="btn-accent btn-sm cursor-pointer">
      Upload
      <input
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          // Prompt for expiry on types that have one. Cancel = no expiry.
          const needsExpiry =
            type === "CDL" || type === "medical_card" || type === "drug_test" || type === "MVR";
          let expiry: string | undefined;
          if (needsExpiry) {
            const v = prompt(`Expiry for ${type} (YYYY-MM-DD), leave blank if N/A:`);
            if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
              expiry = `${v}T00:00:00.000Z`;
            }
          }
          onFile(f, expiry);
        }}
      />
    </label>
  );
}
