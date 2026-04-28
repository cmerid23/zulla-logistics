import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, carriers, users } from "@zulla/db";
import type { AuthUser, CarrierOnboardingInput } from "@zulla/shared";
import { HttpError } from "../middleware/errorHandler.js";
import { encrypt } from "../lib/encryption.js";
import { fmcsa } from "../lib/fmcsa.js";
import { resend } from "../lib/resend.js";

interface CarrierRegisterInput {
  email: string;
  password: string;
  companyName: string;
  contactName: string;
  phone: string;
  yearsInBusiness?: string;
  numberOfTrucks?: string;
  onboarding: CarrierOnboardingInput;
}

export const carrierService = {
  async list() {
    return db.select().from(carriers);
  },

  async getById(id: string) {
    const row = await db.query.carriers.findFirst({ where: eq(carriers.id, id) });
    if (!row) throw new HttpError(404, "Carrier not found");
    return row;
  },

  async getByUser(userId: string) {
    return db.query.carriers.findFirst({ where: eq(carriers.userId, userId) });
  },

  /**
   * One-shot carrier registration used by /carrier/join. Creates the user,
   * creates the carrier profile, runs FMCSA, decides auto-approve, sends emails,
   * and pings the admin via SMS for a manual review when flags are present.
   */
  async registerWithOnboarding(input: CarrierRegisterInput) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
    if (existing) throw new HttpError(409, "Email already registered");

    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
    const passwordHash = await bcrypt.hash(input.password, rounds);

    const [user] = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        role: "carrier",
        companyName: input.companyName,
        contactName: input.contactName,
        phone: input.phone,
      })
      .returning();
    if (!user) throw new HttpError(500, "Failed to create user");

    const fmcsaSummary = await runFmcsa(input.onboarding.mcNumber, input.onboarding.dotNumber);
    const autoApprove =
      fmcsaSummary?.authorityActive && fmcsaSummary?.insuranceOnFile && fmcsaSummary.flags.length === 0;

    const [carrier] = await db
      .insert(carriers)
      .values({
        userId: user.id,
        mcNumber: input.onboarding.mcNumber ?? null,
        dotNumber: input.onboarding.dotNumber ?? null,
        authorityStatus: input.onboarding.authorityStatus ?? fmcsaSummary?.authorityStatus ?? null,
        authoritySince: input.onboarding.authoritySince ? new Date(input.onboarding.authoritySince) : null,
        insuranceExpiry: input.onboarding.insuranceExpiry ? new Date(input.onboarding.insuranceExpiry) : null,
        safetyRating: input.onboarding.safetyRating ?? fmcsaSummary?.safetyRating ?? null,
        outOfServicePct: fmcsaSummary?.outOfServicePct?.toString() ?? null,
        equipmentTypes: input.onboarding.equipmentTypes ?? [],
        preferredOriginStates: input.onboarding.preferredOriginStates ?? [],
        preferredDestStates: input.onboarding.preferredDestStates ?? [],
        factoringPartner: input.onboarding.factoringPartner ?? null,
        factoringAccount: input.onboarding.factoringAccount ?? null,
        bankRoutingEncrypted: input.onboarding.bankRouting ? encrypt(input.onboarding.bankRouting) : null,
        bankAccountEncrypted: input.onboarding.bankAccount ? encrypt(input.onboarding.bankAccount) : null,
        onboardingStep: 6,
        onboardingComplete: Boolean(autoApprove),
      })
      .returning();
    if (!carrier) throw new HttpError(500, "Failed to create carrier profile");

    // Welcome / review emails (best effort).
    resend
      .send({
        to: user.email,
        subject: autoApprove ? "You're verified — start finding loads" : "Application received — under review",
        html: autoApprove
          ? `<p>Welcome to Zulla. Your account is verified — sign in and start finding loads.</p>`
          : `<p>We received your application. Manual review usually takes about 2 hours. We'll email you when you're approved.</p>`,
      })
      .catch((err) => console.warn("[carrier] welcome email failed", err));

    if (!autoApprove) {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        resend
          .send({
            to: adminEmail,
            subject: `[Zulla] New carrier review needed — ${input.companyName}`,
            html: `<p>New carrier application from <strong>${input.companyName}</strong> needs manual review.</p><p>FMCSA flags: ${fmcsaSummary?.flags?.join(", ") || "none"}.</p>`,
          })
          .catch((err) => console.warn("[carrier] admin notify email failed", err));
      }
    }

    return {
      autoApprove: Boolean(autoApprove),
      flags: fmcsaSummary?.flags ?? [],
      carrierId: carrier.id,
      userId: user.id,
    };
  },

  async onboard(userId: string, input: CarrierOnboardingInput) {
    const existing = await db.query.carriers.findFirst({ where: eq(carriers.userId, userId) });
    if (existing) {
      const [updated] = await db
        .update(carriers)
        .set({
          mcNumber: input.mcNumber ?? existing.mcNumber,
          dotNumber: input.dotNumber ?? existing.dotNumber,
          authorityStatus: input.authorityStatus ?? existing.authorityStatus,
          authoritySince: input.authoritySince ? new Date(input.authoritySince) : existing.authoritySince,
          insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : existing.insuranceExpiry,
          safetyRating: input.safetyRating ?? existing.safetyRating,
          equipmentTypes: input.equipmentTypes ?? existing.equipmentTypes,
          preferredOriginStates: input.preferredOriginStates ?? existing.preferredOriginStates,
          preferredDestStates: input.preferredDestStates ?? existing.preferredDestStates,
          factoringPartner: input.factoringPartner ?? existing.factoringPartner,
          factoringAccount: input.factoringAccount ?? existing.factoringAccount,
          bankRoutingEncrypted: input.bankRouting ? encrypt(input.bankRouting) : existing.bankRoutingEncrypted,
          bankAccountEncrypted: input.bankAccount ? encrypt(input.bankAccount) : existing.bankAccountEncrypted,
          onboardingStep: input.onboardingStep ?? existing.onboardingStep,
          onboardingComplete: input.onboardingComplete ?? existing.onboardingComplete,
          updatedAt: new Date(),
        })
        .where(eq(carriers.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(carriers)
      .values({
        userId,
        mcNumber: input.mcNumber ?? null,
        dotNumber: input.dotNumber ?? null,
        authorityStatus: input.authorityStatus ?? null,
        authoritySince: input.authoritySince ? new Date(input.authoritySince) : null,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        safetyRating: input.safetyRating ?? null,
        equipmentTypes: input.equipmentTypes ?? [],
        preferredOriginStates: input.preferredOriginStates ?? [],
        preferredDestStates: input.preferredDestStates ?? [],
        factoringPartner: input.factoringPartner ?? null,
        factoringAccount: input.factoringAccount ?? null,
        bankRoutingEncrypted: input.bankRouting ? encrypt(input.bankRouting) : null,
        bankAccountEncrypted: input.bankAccount ? encrypt(input.bankAccount) : null,
        onboardingStep: input.onboardingStep ?? 1,
        onboardingComplete: input.onboardingComplete ?? false,
      })
      .returning();
    if (!created) throw new HttpError(500, "Failed to onboard carrier");
    return created;
  },

  async approve(id: string, _actor: AuthUser) {
    const [updated] = await db
      .update(carriers)
      .set({
        onboardingComplete: true,
        highwayVerified: true,
        doNotUse: false,
        updatedAt: new Date(),
      })
      .where(eq(carriers.id, id))
      .returning();
    if (!updated) throw new HttpError(404, "Carrier not found");
    return updated;
  },

  async reject(id: string, _actor: AuthUser, reason: string) {
    const [updated] = await db
      .update(carriers)
      .set({
        doNotUse: true,
        doNotUseReason: reason,
        onboardingComplete: false,
        updatedAt: new Date(),
      })
      .where(eq(carriers.id, id))
      .returning();
    if (!updated) throw new HttpError(404, "Carrier not found");
    // Notify the carrier owner via email.
    const owner = await db.query.users.findFirst({ where: eq(users.id, updated.userId) });
    if (owner?.email) {
      resend
        .send({
          to: owner.email,
          subject: "Zulla application — additional review needed",
          html: `<p>We were unable to approve your application at this time.</p><p>Reason: ${reason}</p><p>If you believe this is in error, reply to this email.</p>`,
        })
        .catch((err) => console.warn("[carrier] reject email failed", err));
    }
    return updated;
  },

  async suspend(id: string, _actor: AuthUser, reason?: string) {
    const [updated] = await db
      .update(carriers)
      .set({
        doNotUse: true,
        doNotUseReason: reason ?? "Suspended by admin",
        updatedAt: new Date(),
      })
      .where(eq(carriers.id, id))
      .returning();
    if (!updated) throw new HttpError(404, "Carrier not found");
    return updated;
  },
};

async function runFmcsa(mc?: string, dot?: string) {
  if (!fmcsa.enabled) return null;
  try {
    const raw = mc ? await fmcsa.lookupByMc(mc) : dot ? await fmcsa.lookupByDot(dot) : null;
    if (!raw) return null;
    return fmcsa.summarize(raw);
  } catch (err) {
    console.warn("[carrier] FMCSA lookup failed", err);
    return null;
  }
}
