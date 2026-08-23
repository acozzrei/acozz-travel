// Password gate for the Settings page and its API routes. Reuses the same
// Settings.masterPassword that already grants full access to every trip,
// rather than a separate secret — one password to remember, not two.
//
// Protection turns on once a master password has been set. With none set
// yet (fresh install), Settings is left open so the first run can set one.
//
// The session cookie is a hash of the master password itself, not the
// password — keeps the plaintext password out of the browser after login,
// and means changing the master password instantly invalidates every
// existing session without a separate secret or sessions table. Same
// pattern as lib/shareAuth.js, which protects trip pages this same way.

import { cookies } from "next/headers";
import { getSettings } from "@/lib/settings";
import { authBypassEnabled } from "@/lib/authBypass";

export const SETTINGS_COOKIE = "settings_session";

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sessionTokenFor(masterPassword) {
  return sha256Hex(`settings-session:${masterPassword}`);
}

export async function isValidSettingsPassword(password, masterPassword) {
  if (!masterPassword) return true;
  return password === masterPassword;
}

// Reads the current request's cookie and returns whether it currently grants
// access to Settings, against the live master password (so changing it in
// the database invalidates every existing session immediately).
export async function getRequestSettingsAccess() {
  if (authBypassEnabled()) return true;
  const settings = await getSettings();
  if (!settings.masterPassword) return true;
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SETTINGS_COOKIE)?.value;
  if (!cookieValue) return false;
  const expected = await sessionTokenFor(settings.masterPassword);
  return cookieValue === expected;
}
