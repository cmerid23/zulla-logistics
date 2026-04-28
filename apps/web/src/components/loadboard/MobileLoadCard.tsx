import { motion } from "framer-motion";
import type { Load } from "@zulla/shared";
import { formatDate, formatMoneyDecimal } from "../../lib/utils";
import { useSwipeGesture } from "../../hooks/useSwipeGesture";

interface Props {
  load: Load;
  onBook: (load: Load) => void;
  onDismiss: (load: Load) => void;
  onClick: (load: Load) => void;
}

export function MobileLoadCard({ load, onBook, onDismiss, onClick }: Props) {
  const ref = useSwipeGesture<HTMLDivElement>({
    onSwipeRight: () => onBook(load),
    onSwipeLeft: () => onDismiss(load),
  });

  const perMile =
    load.shipperRate && load.distanceMiles
      ? `$${(Number(load.shipperRate) / load.distanceMiles).toFixed(2)}`
      : null;

  const isHot =
    load.pickupDate && new Date(load.pickupDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      onClick={() => onClick(load)}
      className={`card relative p-4 ${isHot ? "border-l-4 border-l-orange" : ""}`}
    >
      {isHot && <div className="chip-orange absolute right-3 top-3">HOT</div>}
      <div className="font-display text-lg font-bold leading-tight">
        {load.originCity}, {load.originState} → {load.destinationCity}, {load.destinationState}
      </div>
      <div className="mt-1 mono text-[11px] uppercase tracking-wider text-muted">
        {load.equipmentType} · {load.weightLbs ? `${load.weightLbs.toLocaleString()} lb` : "—"}
      </div>
      <div className="mt-2 mono text-xs text-white/80">Pickup {formatDate(load.pickupDate)}</div>
      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <div className="font-display text-2xl font-extrabold text-green">
            {formatMoneyDecimal(load.shipperRate)}
          </div>
          {perMile && <div className="mono text-xs text-green">{perMile}/mi</div>}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBook(load);
          }}
          className="btn-accent"
        >
          Book Now
        </button>
      </div>
    </motion.div>
  );
}
