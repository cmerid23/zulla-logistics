import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// Derive a 32-byte key from ENCRYPTION_KEY using scrypt. The key is required for
// decrypting bank info; rotating it requires re-encrypting all stored ciphertext.
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("ENCRYPTION_KEY not configured");
  return scryptSync(secret, "zulla.banking.v1", 32);
}

/**
 * Encrypts a UTF-8 plaintext string with AES-256-GCM. Output format:
 *   base64(iv) + ":" + base64(authTag) + ":" + base64(ciphertext)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decrypt(payload: string): string {
  if (!payload) return "";
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid ciphertext");
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}
