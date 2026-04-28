import OpenAI from "openai";
import { z } from "zod";

const apiKey = process.env.OPENAI_API_KEY ?? "";
// gpt-4o-mini is the cheapest model that still produces solid lane-rate JSON.
// Override via OPENAI_MODEL for richer reasoning (e.g. gpt-4o, gpt-4-turbo).
const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// Lazy — the OpenAI SDK doesn't throw on construct with empty key, but we
// still want a clear error when a route actually uses it without configuration.
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}
const ai = new Proxy({} as OpenAI, {
  get(_t, prop: string | symbol) {
    return Reflect.get(getClient(), prop);
  },
});

const SYSTEM_PROMPT =
  "You are an expert freight broker assistant for Zulla Logistics. " +
  "Be concise, factual, and return JSON when asked.";

export { ai };

export async function ask(prompt: string, context?: unknown): Promise<string> {
  const userText = context
    ? `${prompt}\n\nContext:\n${JSON.stringify(context, null, 2)}`
    : prompt;
  const resp = await ai.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userText },
    ],
  });
  return resp.choices[0]?.message?.content ?? "";
}

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
  // Use OpenAI's JSON mode so the response is guaranteed valid JSON. Falls
  // back to a heuristic if the API is unavailable or validation fails.
  let text = "";
  try {
    const resp = await ai.chat.completions.create({
      model,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: RATE_PROMPT(input) },
      ],
    });
    text = resp.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.warn("[ai] rate suggestion call failed, using fallback", err);
  }

  const parsed = parseJsonFromResponse(text);
  const result = rateSuggestionSchema.safeParse(parsed);
  if (result.success) return result.data;

  // Defensive heuristic: $1.50/mile carrier rate, 18% markup for shipper rate.
  const miles = input.distanceMiles ?? 500;
  const carrierRate = Math.max(900, Math.round(miles * 1.5));
  const shipperRate = Math.round(carrierRate * 1.18);
  return {
    shipperRate,
    carrierRate,
    marginPct: Number((((shipperRate - carrierRate) / shipperRate) * 100).toFixed(1)),
    rationale: "Fallback estimate — model unavailable or returned invalid JSON. Heuristic: miles × $1.50, marked up 18%.",
  };
}

function parseJsonFromResponse(s: string): unknown {
  if (!s) return null;
  try {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}
