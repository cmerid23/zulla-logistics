import { useCallback, useState } from "react";
import { api } from "../../lib/api";
import type { DocumentType } from "@zulla/shared";

interface DocSlot {
  type: DocumentType;
  label: string;
  hint: string;
  accept: string;
  generateLink?: string;
}

const SLOTS: DocSlot[] = [
  { type: "COI",                label: "Certificate of Insurance (COI)",  hint: "PDF or image · 25 MB max", accept: "application/pdf,image/*" },
  { type: "W9",                 label: "W-9",                              hint: "PDF · 25 MB max", accept: "application/pdf" },
  { type: "rate_con",           label: "Operating Authority / MC Cert",   hint: "PDF · 25 MB max", accept: "application/pdf" },
  { type: "carrier_agreement",  label: "Carrier Agreement", hint: "Download to review, then upload signed copy", accept: "application/pdf", generateLink: "/legal/carrier-agreement" },
];

export interface UploadedDoc {
  type: DocumentType;
  filename: string;
  r2Key: string;
  fileSizeBytes: number;
}

export type Step3Data = UploadedDoc[];

interface Props {
  onNext: (data: Step3Data) => void;
  onBack: () => void;
  initial?: Step3Data;
}

interface PresignResponse {
  key: string;
  uploadUrl: string;
  expiresIn: number;
}

interface SlotState {
  status: "idle" | "uploading" | "done" | "error";
  progress: number;
  filename?: string;
  r2Key?: string;
  size?: number;
  error?: string;
}

export function Step3Documents({ onNext, onBack, initial }: Props) {
  const [slots, setSlots] = useState<Record<DocumentType, SlotState>>(() => {
    const map: Record<string, SlotState> = {};
    SLOTS.forEach((s) => {
      const existing = initial?.find((d) => d.type === s.type);
      map[s.type] = existing
        ? { status: "done", progress: 100, filename: existing.filename, r2Key: existing.r2Key, size: existing.fileSizeBytes }
        : { status: "idle", progress: 0 };
    });
    return map as Record<DocumentType, SlotState>;
  });

  const upload = useCallback(async (slot: DocSlot, file: File) => {
    setSlots((s) => ({ ...s, [slot.type]: { status: "uploading", progress: 0 } }));
    try {
      const presign = await api.post<PresignResponse>("/documents/presign", {
        type: slot.type,
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        scope: "onboarding",
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presign.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setSlots((s) => ({
              ...s,
              [slot.type]: { ...s[slot.type], status: "uploading", progress: pct },
            }));
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });

      setSlots((s) => ({
        ...s,
        [slot.type]: {
          status: "done",
          progress: 100,
          filename: file.name,
          r2Key: presign.key,
          size: file.size,
        },
      }));
    } catch (err) {
      setSlots((s) => ({
        ...s,
        [slot.type]: { status: "error", progress: 0, error: (err as Error).message },
      }));
    }
  }, []);

  const allDone = SLOTS.every((s) => slots[s.type]?.status === "done");

  function submit() {
    // Only forward slots that actually completed. Carriers can finish onboarding
    // and upload remaining docs from their profile later — Step 3 is encouraged,
    // not strictly required.
    const data: UploadedDoc[] = SLOTS.flatMap((s) => {
      const st = slots[s.type];
      if (st.status !== "done") return [];
      return [{
        type: s.type,
        filename: st.filename ?? "",
        r2Key: st.r2Key ?? "",
        fileSizeBytes: st.size ?? 0,
      }];
    });
    onNext(data);
  }

  const uploadedCount = SLOTS.filter((s) => slots[s.type]?.status === "done").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Upload your documents</h1>
        <p className="mt-1 font-body text-sm text-muted">Drag & drop or click. We&apos;ll PUT directly to R2 — no file leaves your browser through our servers.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SLOTS.map((slot) => (
          <DropZone key={slot.type} slot={slot} state={slots[slot.type]} onFile={(f) => upload(slot, f)} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
        <button type="button" onClick={onBack} className="btn-ghost btn-lg">← Back</button>
        <div className="flex items-center gap-3">
          <span className="mono text-[11px] uppercase tracking-wider text-muted">
            {uploadedCount}/{SLOTS.length} uploaded
          </span>
          <button type="button" onClick={submit} className="btn-accent btn-lg">
            {allDone ? "Continue →" : uploadedCount === 0 ? "Skip for now →" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DropZone({
  slot,
  state,
  onFile,
}: {
  slot: DocSlot;
  state: SlotState;
  onFile: (f: File) => void;
}) {
  const isDone = state.status === "done";
  const isUploading = state.status === "uploading";

  return (
    <label
      className={`block cursor-pointer rounded-card border-2 border-dashed p-5 transition ${
        isDone ? "border-green/40 bg-green/[0.04]" : "border-white/[0.14] bg-white/[0.02] hover:border-accent/40"
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-btn ${isDone ? "bg-green/12 text-green" : "bg-white/[0.06] text-white/70"}`}>
          {isDone ? "✓" : "↑"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm font-bold">{slot.label}</div>
          <div className="mono text-[10px] uppercase tracking-wider text-muted">
            {isDone ? state.filename : slot.hint}
          </div>
        </div>
      </div>
      {slot.generateLink && !isDone && (
        <div className="mt-2">
          <a href={slot.generateLink} target="_blank" rel="noreferrer" className="mono text-[11px] text-accent underline">
            Download to review, then upload signed copy
          </a>
        </div>
      )}
      {isUploading && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full bg-accent transition-all" style={{ width: `${state.progress}%` }} />
        </div>
      )}
      {state.status === "error" && (
        <div className="mt-2 text-xs text-red-400">{state.error}</div>
      )}
      <input
        type="file"
        accept={slot.accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </label>
  );
}
