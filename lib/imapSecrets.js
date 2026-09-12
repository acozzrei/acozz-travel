import crypto from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "g1";

// The Gmail IMAP app password is encrypted at rest with AES-256-GCM. The key
// comes from the GMAIL_IMAP_KEY environment variable: 64 hex characters
// (32 bytes), e.g. generated with `openssl rand -hex 32`. The same value must
// be set everywhere the app runs (local dev, Vercel) or saved passwords
// can't be decrypted.
function getKey() {
  const hex = (process.env.GMAIL_IMAP_KEY || "").trim();
  if (!hex) {
    throw new Error(
      "Set the GMAIL_IMAP_KEY environment variable (generate one with `openssl rand -hex 32`)."
    );
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("GMAIL_IMAP_KEY must be 64 hex characters (32 bytes).");
  }
  return key;
}

export function encryptSecret(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}

export function decryptSecret(payload) {
  const key = getKey();
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
