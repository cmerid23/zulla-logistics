import { useState } from "react";
import { motion } from "framer-motion";
import { formatMoneyDecimal } from "../../lib/utils";

export interface RateSuggestion {
  shipperRate: number;
  carrierRate: number;
  marginPct: number;
  rationale: string;
}

interface Props {
  suggestion: RateSuggestion;
  onAccept: (rates: { shipperRate: string; carrierRate: string }) => void;
  pending?: boolean;
}

export function RateSuggestionCard({ suggestion, onAccept, pending }: Props) {
  const [shipper, setShipper] = useState(suggestion.shipperRate.toFixed(0));
  const [carrier, setCarrier] = useState(suggestion.carrierRate.toFixed(0));

  const margin = Math.max(0, Number(shipper) - Number(carrier));
  const marginPct = Number(shipper) > 0 ? (margin / Number(shipper)) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel relative overflow-hidden p-6"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-btn bg-accent/12 text-accent">✦</span>
        <div className="font-display text-base font-bold">AI Rate Suggestion</div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="mono mb-1 text-[10px] uppercase tracking-wider text-muted">Shipper rate</div>
          <input
            inputMode="decimal"
            value={shipper}
            onChange={(e) => setShipper(e.target.value.replace(/[^\d.]/g, ""))}
            className="input mono text-2xl font-bold"
          />
        </div>
        <div>
          <div className="mono mb-1 text-[10px] uppercase tracking-wider text-muted">Carrier rate</div>
          <input
            inputMode="decimal"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value.replace(/[^\d.]/g, ""))}
            className="input mono text-2xl font-bold"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-btn border border-white/[0.07] bg-deep px-4 py-3">
        <span className="mono text-[11px] uppercase tracking-wider text-muted">Broker margin</span>
        <span className="font-display text-lg font-bold text-accent">
          {formatMoneyDecimal(margin)} <span className="mono text-xs text-muted">({marginPct.toFixed(1)}%)</span>
        </span>
      </div>

      <p className="mt-4 font-body text-sm italic text-white/80">
        &ldquo;{suggestion.rationale}&rdquo;
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          onClick={() =>
            onAccept({
              shipperRate: Number(shipper).toFixed(2),
              carrierRate: Number(carrier).toFixed(2),
            })
          }
          disabled={pending}
          className="btn-accent btn-lg"
        >
          {pending ? "Posting…" : "Accept & Post Load"}
        </button>
      </div>
    </motion.div>
  );
}
