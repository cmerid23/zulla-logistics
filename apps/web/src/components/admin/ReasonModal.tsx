import { useState } from "react";
import { Modal } from "../ui/Modal";

interface Props {
  open: boolean;
  title: string;
  ctaLabel: string;
  ctaTone?: "danger" | "accent";
  onClose: () => void;
  onConfirm: (reason: string) => void;
  pending?: boolean;
}

export function ReasonModal({ open, title, ctaLabel, ctaTone = "danger", onClose, onConfirm, pending }: Props) {
  const [reason, setReason] = useState("");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason.trim() || pending}
            className={ctaTone === "danger" ? "btn-danger" : "btn-accent"}
          >
            {pending ? "Saving…" : ctaLabel}
          </button>
        </>
      }
    >
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        placeholder="Explain the reason for this action…"
        className="input"
        autoFocus
      />
    </Modal>
  );
}
