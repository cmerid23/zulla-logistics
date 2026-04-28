// Highway carrier-monitoring API client. https://highway.com/

const apiKey = process.env.HIGHWAY_API_KEY ?? "";

export const highway = {
  enabled: Boolean(apiKey),
  async lookupCarrier(_dotOrMc: string): Promise<unknown | null> {
    if (!apiKey) return null;
    // TODO: call Highway endpoints once API contract is finalized.
    return null;
  },
};
