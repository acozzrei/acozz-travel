// Lightweight password gate for the Settings page and its API routes.
//
// This is deliberately simple (single shared password, no user accounts) since
// the app itself is single-user. Protection only turns on when SETTINGS_PASSWORD
// is configured as an environment variable — with no password set, Settings is
// left open, same as before (so local dev needs no setup).
//
// The session cookie is a SHA-256 hash of the password itself, not the raw
// password — that keeps the plaintext password out of the browser after login,
// and means changing the password instantly invalidates every existing session
// without needing a separate secret or a sessions table. Uses Web Crypto so it
// works in both the Edge middleware runtime and normal Node API routes.

export const SETTINGS_COOKIE = "settings_session";

export function settingsAuthEnabled() {
  return Boolean(process.env.SETTINGS_PASSWORD);
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sessionTokenFor(password) {
  return sha256Hex(`settings-session:${password}`);
}

export async function isValidPassword(password) {
  if (!settingsAuthEnabled()) return true;
  return password === process.env.SETTINGS_PASSWORD;
}

export async function isValidSessionCookie(cookieValue) {
  if (!settingsAuthEnabled()) return true;
  if (!cookieValue) return false;
  const expected = await sessionTokenFor(process.env.SETTINGS_PASSWORD);
  return cookieValue === expected;
}
