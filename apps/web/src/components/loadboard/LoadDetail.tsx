import { motion, AnimatePresence } from "framer-motion";
import type { Load } from "@zulla/shared";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";
import { RouteMap } from "../maps/RouteMap";

interface Props {
  load: Load | null;
  onClose: () => void;
  onBook: (load: Load) => void;
}

export function LoadDetail({ load, onClose, onBook }: Props) {
  return (
    <AnimatePresence>
      {load && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl rounded-t-modal bg-surface md:rounded-modal"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-white/[0.07] p-5">
              <div>
                <div className="mono text-[11px] uppercase tracking-wider text-muted">
                  {load.referenceNumber ?? load.id.slice(0, 8)}
                </div>
                <div className="mt-1 font-display text-xl font-extrabold leading-tight">
                  {load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}
                </div>
              </div>
              <button onClick={onClose} className="text-muted hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
              <Stat label="Equipment" value={load.equipmentType} />
              <Stat label="Weight" value={load.weightLbs ? `${load.weightLbs.toLocaleString()} lb` : "—"} />
              <Stat label="Pickup" value={formatDate(load.pickupDate)} />
              <Stat label="Distance" value={load.distanceMiles ? `${load.distanceMiles} mi` : "—"} />
              <Stat label="Commodity" value={load.commodity ?? "—"} />
              <Stat label="Special" value={load.specialInstructions ?? "—"} />
            </div>

            <div className="px-5 pb-5">
              <div className="mono mb-2 text-[11px] uppercase tracking-wider text-muted">Route</div>
              <RouteMap height={240} />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] p-5">
              <div>
                <div className="mono text-[11px] uppercase tracking-wider text-muted">Shipper rate</div>
                <div className="font-display text-3xl font-extrabold text-green">
                  {formatMoneyDecimal(load.shipperRate)}
                </div>
              </div>
              <button onClick={() => onBook(load)} className="btn-accent btn-lg flex-1 md:flex-none">
                Book Now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-btn border border-white/[0.07] bg-deep p-3">
      <div className="mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-0.5 font-body text-sm">{value}</div>
    </div>
  );
}
