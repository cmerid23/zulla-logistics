// FMCSA SAFER lookup. Two transports:
//   1) Public webKey JSON API: https://mobile.fmcsa.dot.gov/qc/services/...
//   2) Legacy SAFER XML response — parsed with fast-xml-parser (per spec).
//
// We prefer JSON when FMCSA_WEBKEY is configured. The XML path is kept as a
// fallback for raw SAFER responses that some integrations still return.

import { XMLParser } from "fast-xml-parser";

const baseUrl = "https://mobile.fmcsa.dot.gov/qc/services";
const webKey = process.env.FMCSA_WEBKEY ?? "";

export interface FmcsaSummary {
  authorityStatus: string | null;
  safetyRating: string | null;
  insuranceOnFile: boolean;
  outOfServicePct: number | null;
  authorityActiveDays: number | null;
  authorityActive: boolean;
  flags: string[];
  raw?: unknown;
}

interface FmcsaCarrierJson {
  content?: {
    carrier?: {
      allowedToOperate?: string;
      statusCode?: string;
      safetyRating?: string;
      bipdInsuranceOnFile?: string;
      driverOosRate?: string | number;
      vehicleOosRate?: string | number;
      mcs150Date?: string;
    };
  };
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export const fmcsa = {
  enabled: Boolean(webKey),

  async lookupByDot(dot: string): Promise<FmcsaCarrierJson> {
    if (!webKey) throw new Error("FMCSA_WEBKEY not configured");
    const res = await fetch(`${baseUrl}/carriers/${dot}?webKey=${webKey}`);
    if (!res.ok) throw new Error(`FMCSA lookup failed: ${res.status}`);
    return res.json() as Promise<FmcsaCarrierJson>;
  },

  async lookupByMc(mc: string): Promise<FmcsaCarrierJson> {
    if (!webKey) throw new Error("FMCSA_WEBKEY not configured");
    const cleaned = mc.replace(/[^\d]/g, "");
    const res = await fetch(`${baseUrl}/carriers/docket-number/${cleaned}?webKey=${webKey}`);
    if (!res.ok) throw new Error(`FMCSA lookup failed: ${res.status}`);
    return res.json() as Promise<FmcsaCarrierJson>;
  },

  /**
   * Parse a raw SAFER XML response (the legacy carrier query endpoint emits XML).
   * Returns the same FmcsaCarrierJson shape so `summarize()` can normalise both.
   */
  parseXml(xmlBody: string): FmcsaCarrierJson {
    const parsed = xml.parse(xmlBody) as Record<string, unknown>;
    const carrier =
      (parsed?.QCResponse as Record<string, unknown> | undefined)?.carrier ??
      (parsed?.content as Record<string, unknown> | undefined)?.carrier ??
      {};
    return { content: { carrier: carrier as never } };
  },

  /** Distill a SAFER response into the flags the onboarding wizard renders. */
  summarize(response: FmcsaCarrierJson): FmcsaSummary {
    const c = response.content?.carrier ?? {};
    const authorityActive = (c.allowedToOperate ?? "").toUpperCase() === "Y";
    const authorityStatus = c.statusCode ?? (authorityActive ? "ACTIVE" : "INACTIVE");
    const insuranceOnFile = Boolean(c.bipdInsuranceOnFile && Number(c.bipdInsuranceOnFile) > 0);
    const outOfServicePct = c.vehicleOosRate != null ? Number(c.vehicleOosRate) : null;

    let authorityActiveDays: number | null = null;
    if (c.mcs150Date) {
      const ms = Date.now() - Date.parse(c.mcs150Date);
      if (Number.isFinite(ms)) authorityActiveDays = Math.floor(ms / (1000 * 60 * 60 * 24));
    }

    const flags: string[] = [];
    if (!authorityActive) flags.push("Authority not active");
    if (!insuranceOnFile) flags.push("No insurance on file");
    if (outOfServicePct != null && outOfServicePct > 10) flags.push("OOS rate > 10%");
    if (authorityActiveDays != null && authorityActiveDays < 90) flags.push("Authority < 90 days");

    return {
      authorityStatus,
      safetyRating: c.safetyRating ?? null,
      insuranceOnFile,
      outOfServicePct,
      authorityActiveDays,
      // alias retained for the existing frontend onboarding step
      daysSinceAuthority: authorityActiveDays,
      authorityActive,
      flags,
      raw: response,
    } as FmcsaSummary & { daysSinceAuthority: number | null };
  },
};
