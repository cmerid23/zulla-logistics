import { dat } from "../lib/dat.js";
import { getRateSuggestion, type RateSuggestionInput, type RateSuggestionResult } from "../lib/claude.js";
import { db, aiRateSuggestions } from "@zulla/db";

type RateRequest = RateSuggestionInput;

export const rateService = {
  async suggest(req: RateRequest): Promise<RateSuggestionResult> {
    // 1) DAT mid, when available, gives us the lane mid. We mark up 18% to derive the shipper rate.
    const dat3 = await dat.getRate({
      originCity: req.originCity,
      originState: req.originState,
      destCity: req.destinationCity,
      destState: req.destinationState,
      equipment: req.equipmentType,
    }).catch(() => null);

    if (dat3) {
      const carrierRate = dat3.avgCents / 100;
      const shipperRate = Math.round(carrierRate * 1.18);
      const marginPct = ((shipperRate - carrierRate) / shipperRate) * 100;
      const result: RateSuggestionResult = {
        shipperRate,
        carrierRate: Math.round(carrierRate),
        marginPct: Number(marginPct.toFixed(1)),
        rationale: `DAT mid: $${(dat3.avgCents / 100).toFixed(0)} (low $${(dat3.lowCents / 100).toFixed(0)} – high $${(dat3.highCents / 100).toFixed(0)}). Marked up 18% for the shipper rate.`,
      };
      await persistSuggestion(result);
      return result;
    }

    // 2) Claude fallback — getRateSuggestion handles JSON parsing + Zod validation.
    const result = await getRateSuggestion(req);
    await persistSuggestion(result);
    return result;
  },
};

async function persistSuggestion(r: RateSuggestionResult) {
  try {
    await db.insert(aiRateSuggestions).values({
      suggestedShipperRate: r.shipperRate.toFixed(2),
      suggestedCarrierRate: r.carrierRate.toFixed(2),
      suggestedMarginPct: r.marginPct.toFixed(2),
      rationale: r.rationale,
    });
  } catch (err) {
    console.warn("[rate] failed to persist suggestion", err);
  }
}
