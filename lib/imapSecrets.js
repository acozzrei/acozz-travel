import crypto from "crypto";
import { updateSettings } from "@/lib/settings";

const ALGO = "aes-256-gcm";
const PREFIX = "g1";

// The Gmail IMAP app password is encrypted at rest with AES-256-GCM. The key
// is GMAIL_IMAP_KEY when set (strongest: key lives outside the database),
// otherwise the app generates a random key on first Gmail connect and keeps
// it in Settings.gmailImapDataKey — fully self-sufficient, no extra env vars
// or dashboard work needed.
function keyFromEnv() {
  const hex = (process.env.GMAIL_IMAP_KEY || "").trim();
  if (!hex) return null;
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("GMAIL_IMAP_KEY must be 64 hex characters (32 bytes).");
  }
  return key;
}

function keyFromSettings(settings) {
  const hex = (settings?.gmailImapDataKey || "").trim();
  if (!hex) return null;
  const key = Buffer.from(hex, "hex");
  return key.length === 32 ? key : null;
}

/** Returns the encryption key, generating and persisting one if needed. */
export async function ensureDataKey(settings) {
  return (
    keyFromEnv() ||
    keyFromSettings(settings) ||
    (await generateAndStoreDataKey())
  );
}

/** Returns the encryption key, or null when none exists yet. */
export function getDataKey(settings) {
  return keyFromEnv() || keyFromSettings(settings);
}

async function generateAndStoreDataKey() {
  const key = crypto.randomBytes(32);
  await updateSettings({ gmailImapDataKey: key.toString("hex") });
  return key;
}

export function encryptSecret(plaintext, key) {
  if (!key) throw new Error("No encryption key available.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}

export function decryptSecret(payload, key) {
  if (!key) throw new Error("No encryption key available — reconnect Gmail in Settings.");
  const [version, ivHex, tagHex, dataHex] = String(payload || "").split(":");
  if (version !== PREFIX || !ivHex || !tagHex || !dataHex) {
    throw new Error("Unrecognized encrypted value.");
  }
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
