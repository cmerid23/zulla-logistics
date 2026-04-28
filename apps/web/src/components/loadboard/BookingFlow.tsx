import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import type { Load } from "@zulla/shared";
import { api } from "../../lib/api";
import { formatMoneyDecimal } from "../../lib/utils";
import { useAuthStore } from "../../stores/auth.store";

interface BookResponse {
  load: Load;
  codeRequired: boolean;
}

interface Props {
  load: Load | null;
  onClose: () => void;
  onBooked: (load: Load) => void;
}

type Stage = "confirm" | "code" | "success";

export function BookingFlow({ load, onClose, onBooked }: Props) {
  const [stage, setStage] = useState<Stage>("confirm");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const userEmail = useAuthStore((s) => s.user?.email);

  const book = useMutation({
    mutationFn: () => api.post<BookResponse>(`/loads/${load!.id}/book`),
    onSuccess: () => setStage("code"),
  });

  const verify = useMutation({
    mutationFn: () => api.post(`/loads/${load!.id}/verify-ratecon`, { code }),
    onSuccess: () => {
      setStage("success");
      if (typeof navigator.vibrate === "function") navigator.vibrate([100, 50, 200]);
      setTimeout(() => {
        if (load) onBooked(load);
      }, 1600);
    },
    onError: (err) => setError((err as Error).message),
  });

  function reset() {
    setStage("confirm");
    setCode("");
    setError(null);
  }

  return (
    <AnimatePresence onExitComplete={reset}>
      {load && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-t-modal bg-surface p-6 md:rounded-modal"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            onClick={(e) => e.stopPropagation()}
          >
            {stage === "confirm" && (
              <>
                <h3 className="font-display text-xl font-extrabold tracking-tight">Confirm booking</h3>
                <div className="mt-3 font-body text-sm text-white/85">
                  Booking <span className="font-semibold">{load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}</span> at{" "}
                  <span className="text-green">{formatMoneyDecimal(load.shipperRate)}</span>.
                </div>
                <div className="mt-4 mono text-xs text-muted">
                  Rate confirmation will be emailed to <span className="text-white">{userEmail ?? "your account"}</span> with a 6-digit code.
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button onClick={onClose} className="btn-ghost">Cancel</button>
                  <button onClick={() => book.mutate()} disabled={book.isPending} className="btn-accent">
                    {book.isPending ? "Booking…" : "Confirm & Book"}
                  </button>
                </div>
                {book.error && <div className="mt-3 text-xs text-red-400">{(book.error as Error).message}</div>}
              </>
            )}

            {stage === "code" && (
              <>
                <h3 className="font-display text-xl font-extrabold tracking-tight">Enter verification code</h3>
                <p className="mt-2 font-body text-sm text-muted">
                  Check your email for a 6-digit code from Zulla. Required to activate the rate confirmation.
                </p>
                <input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="input mono mt-4 text-center text-2xl tracking-[0.4em]"
                />
                {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
                <div className="mt-6 flex justify-end gap-2">
                  <button onClick={onClose} className="btn-ghost">Cancel</button>
                  <button
                    onClick={() => verify.mutate()}
                    disabled={code.length !== 6 || verify.isPending}
                    className="btn-accent"
                  >
                    {verify.isPending ? "Verifying…" : "Verify"}
                  </button>
                </div>
              </>
            )}

            {stage === "success" && (
              <div className="py-8 text-center">
                <motion.div
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: [0.4, 1.2, 1], opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green/20 text-3xl text-green"
                >
                  ✓
                </motion.div>
                <h3 className="mt-5 font-display text-2xl font-extrabold">Load Booked</h3>
                <p className="mt-2 font-body text-sm text-muted">
                  Reference: <span className="mono text-white">{load.referenceNumber ?? load.id.slice(0, 8)}</span>
                </p>
                <button onClick={() => onBooked(load)} className="btn-accent btn-lg mt-6 w-full">
                  View My Loads
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
