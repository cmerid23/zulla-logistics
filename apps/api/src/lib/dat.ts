// DAT One client. Replace stubs with real DAT One endpoints once credentials issue.

interface DatQuote {
  lowCents: number;
  avgCents: number;
  highCents: number;
}

interface DatPosting {
  datPostingId: string;
  status: string;
  inquiries: Array<{ carrierName: string; mc: string; phone?: string; offerCents?: number }>;
}

interface DatPostingInput {
  id: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  equipmentType: string;
  pickupDate: Date | null;
  shipperRate?: string | null;
}

// Spec uses DAT_API_KEY/SECRET; existing code used DAT_USERNAME/PASSWORD. Accept both.
const apiKey = process.env.DAT_API_KEY ?? process.env.DAT_USERNAME;
const apiSecret = process.env.DAT_API_SECRET ?? process.env.DAT_PASSWORD;

export const dat = {
  enabled: Boolean(apiKey && apiSecret),

  async getRate(_req: {
    originCity: string;
    originState: string;
    destCity: string;
    destState: string;
    equipment: string;
  }): Promise<DatQuote | null> {
    if (!apiKey || !apiSecret) return null;
    // TODO: implement real DAT API call (auth, RateView lookup endpoint).
    return null;
  },

  /** Post a load to DAT One as overflow capacity. */
  async postLoad(load: DatPostingInput): Promise<DatPosting> {
    if (!apiKey || !apiSecret) {
      // Stub returns a fake posting id so the UI flow can be exercised in dev.
      return {
        datPostingId: `stub-${load.id.slice(0, 8)}`,
        status: "stubbed",
        inquiries: [],
      };
    }
    // TODO: real DAT One POST /load endpoint with auth.
    throw new Error("DAT post not yet implemented");
  },

  /** Pull current inquiries against an existing posting. */
  async getPostingResponses(_datPostingId: string) {
    if (!apiKey || !apiSecret) return [];
    // TODO: real DAT One GET /postings/:id/inquiries endpoint.
    return [] as Array<{ carrierName: string; mc: string; phone?: string; offerCents?: number }>;
  },
};
