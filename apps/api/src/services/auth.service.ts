import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, users, shippers, carriers } from "@zulla/db";
import type { AuthTokens, AuthUser, RegisterInput, LoginInput } from "@zulla/shared";
import { HttpError } from "../middleware/errorHandler.js";
import { resend } from "../lib/resend.js";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
const REFRESH_TTL_DAYS = 7;

function signAccess(user: AuthUser): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new HttpError(500, "JWT not configured");
  // `expiresIn` accepts a literal-typed string ("15m", "1h"…) but env-derived
  // values are plain `string`; cast through SignOptions to keep TS happy.
  const options = { expiresIn: ACCESS_TTL } as SignOptions;
  return jwt.sign(user, secret, options);
}

function makeRandomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

function toAuthUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    companyName: row.companyName,
    contactName: row.contactName,
    phone: row.phone,
    emailVerified: row.emailVerified ?? false,
  };
}

async function sendVerificationEmail(email: string, token: string) {
  const url = `${process.env.WEB_ORIGIN ?? "http://localhost:5173"}/verify-email?token=${token}`;
  await resend.send({
    to: email,
    subject: "Verify your Zulla account",
    html: `<p>Welcome to Zulla.</p><p><a href="${url}">Verify your email</a> to activate your account.</p>`,
  });
}

export const authService = {
  /**
   * Register flow: shipper or carrier only. Creates the user, generates an email
   * verify token, sends the verify email, and creates the matching profile row
   * (shippers or carriers) so the rest of the app can resolve `req.user → profile`.
   * Returns no tokens — user must verify email then log in.
   */
  async register(input: RegisterInput): Promise<{ message: string }> {
    if (input.role !== "shipper" && input.role !== "carrier") {
      throw new HttpError(400, "Only shippers and carriers may self-register");
    }

    const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
    if (existing) throw new HttpError(409, "Email already registered");

    const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
    const passwordHash = await bcrypt.hash(input.password, rounds);
    const emailVerifyToken = makeRandomSecret();

    const [created] = await db
      .insert(users)
      .values({
        email: input.email,
        passwordHash,
        role: input.role,
        companyName: input.companyName ?? null,
        contactName: input.contactName ?? null,
        phone: input.phone ?? null,
        emailVerifyToken,
      })
      .returning();
    if (!created) throw new HttpError(500, "Failed to create user");

    if (input.role === "shipper") {
      await db.insert(shippers).values({
        userId: created.id,
        companyName: input.companyName ?? created.email,
        contactName: input.contactName ?? null,
        phone: input.phone ?? null,
      });
    } else if (input.role === "carrier") {
      await db.insert(carriers).values({ userId: created.id });
    }

    await sendVerificationEmail(created.email, emailVerifyToken).catch((err) =>
      console.warn("[auth] verify email send failed", err),
    );

    return { message: "Check your email" };
  },

  async login(input: LoginInput): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const row = await db.query.users.findFirst({ where: eq(users.email, input.email) });
    if (!row) throw new HttpError(401, "Invalid credentials");

    const ok = await bcrypt.compare(input.password, row.passwordHash);
    if (!ok) throw new HttpError(401, "Invalid credentials");

    const user = toAuthUser(row);
    const tokens = await this.issueTokens(user);
    return { user, tokens };
  },

  async issueTokens(user: AuthUser): Promise<AuthTokens> {
    const accessToken = signAccess(user);
    const secret = makeRandomSecret();
    // Refresh token is `${userId}.${secret}`; only the bcrypt hash of the secret
    // is stored on the user row, so the token only works for the right user.
    const refreshToken = `${user.id}.${secret}`;
    const tokenHash = await bcrypt.hash(secret, 10);
    const expiresAt = Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

    await db
      .update(users)
      .set({ refreshToken: tokenHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return { accessToken, refreshToken, expiresAt };
  },

  async refresh(refreshToken: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const dot = refreshToken.indexOf(".");
    if (dot < 0) throw new HttpError(401, "Invalid refresh token");
    const userId = refreshToken.slice(0, dot);
    const secret = refreshToken.slice(dot + 1);

    const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!row || !row.refreshToken) throw new HttpError(401, "Invalid refresh token");

    const ok = await bcrypt.compare(secret, row.refreshToken);
    if (!ok) throw new HttpError(401, "Invalid refresh token");

    const user = toAuthUser(row);
    const tokens = await this.issueTokens(user);
    return { user, tokens };
  },

  async logout(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ refreshToken: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  },

  async verifyEmail(token: string): Promise<{ ok: true }> {
    const row = await db.query.users.findFirst({
      where: eq(users.emailVerifyToken, token),
    });
    if (!row) throw new HttpError(400, "Invalid or expired token");
    await db
      .update(users)
      .set({ emailVerified: true, emailVerifyToken: null, updatedAt: new Date() })
      .where(eq(users.id, row.id));
    return { ok: true };
  },
};
