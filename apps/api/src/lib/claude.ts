import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
// Spec pins claude-sonnet-4-6. Allow override via env.
const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const client = new Anthropic({ apiKey });

const SYSTEM_PROMPT =
  "You are an expert freight broker assistant for Zulla Logistics. " +
  "Be concise, factual, and return JSON when asked.";

export const claude = {
  client,
  model,
  async ask(prompt: string, context?: unknown): Promise<string> {
    const userText = context
      ? `${prompt}\n\nContext:\n${JSON.stringify(context, null, 2)}`
      : prompt;
    const resp = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
    });
    const block = resp.content[0];
    if (block && block.type === "text") return block.text;
    return "";
  },
};

// =====================================================================
// Rate suggestion — single typed function, used by /api/ai/rate-suggestion.
// =====================================================================

export interface RateSuggestionInput {
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  equipmentType: string;
  weightLbs?: number | null;
  commodity?: string | null;
  pickupDate?: string | null;
  distanceMiles?: number | null;
}

const rateSuggestionSchema = z.object({
  shipperRate: z.number().positive(),
  carrierRate: z.number().positive(),
  marginPct: z.number().min(0).max(60),
  rationale: z.string().min(1).max(800),
});
export type RateSuggestionResult = z.infer<typeof rateSuggestionSchema>;

const RATE_PROMPT = (i: RateSuggestionInput) => `You are pricing a US-domestic truckload.

Lane: ${i.originCity}, ${i.originState} -> ${i.destinationCity}, ${i.destinationState}
Distance: ${i.distanceMiles ?? "unknown"} miles
Equipment: ${i.equipmentType}
Weight: ${i.weightLbs ?? "unknown"} lbs
Commodity: ${i.commodity ?? "general freight"}
Pickup: ${i.pickupDate ?? "asap"}

Market context (mid-2025):
- Van broker margins typically run 13-14%
- Flatbed broker margins typically run 10-11%
- Reefer broker margins typically run 12-13%
- Texas spot market is active; intra-state TX is competitive
- Apply seasonal adjustments: produce season pulls reefer rates up Apr-Jul,
  hurricane season tightens flatbed Aug-Oct, year-end pulls van rates up
  Nov-Dec

Return ONLY a JSON object with this exact shape (no commentary, no markdown):
{
  "shipperRate": number,
  "carrierRate": number,
  "marginPct": number,
  "rationale": "1-2 sentences explaining the lane price and timing factors"
}

Rates are in whole USD. shipperRate must be > carrierRate.`;

export async function getRateSuggestion(input: RateSuggestionInput): Promise<RateSuggestionResult> {
  const text = await claude.ask(RATE_PROMPT(input));
  const parsed = parseJsonFromResponse(text);
  const result = rateSuggestionSchema.safeParse(parsed);
  if (result.success) return result.data;

  // Defensive fallback so the API never crashes if the model returns malformed
  // JSON. Use $1.50/mile-style heuristic on miles when present.
  const miles = input.distanceMiles ?? 500;
  const carrierRate = Math.max(900, Math.round(miles * 1.5));
  const shipperRate = Math.round(carrierRate * 1.18);
  return {
    shipperRate,
    carrierRate,
    marginPct: Number((((shipperRate - carrierRate) / shipperRate) * 100).toFixed(1)),
    rationale: "Fallback estimate — model JSON failed validation. Heuristic: miles × $1.50, marked up 18%.",
  };
}

function parseJsonFromResponse(s: string): unknown {
  try {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}
