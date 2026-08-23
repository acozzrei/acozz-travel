// App-wide gate for the home page (trip list) and the rest of the owner's
// nav shell — separate from lib/shareAuth.js (one specific trip's own page)
// and lib/settingsAuth.js (the Settings page). Two passwords grant two
// roles here:
//   - Settings.masterPassword (the same one used everywhere else) -> "edit"
//   - Settings.viewPassword (new, app-wide, read-only)              -> "view"
//
// A specific trip's own direct link/password (Trip.sharePassword via
// lib/shareAuth.js) is untouched and still works on its own — this gate
// only covers the home page and the app shell around it, not deep links
// into an individual trip.
//
// Same hash-of-(role+password) cookie pattern as the other two auth
// modules: nothing secret is stored client-side, and changing either
// password invalidates existing sessions instantly with no sessions table.

import { cookies } from "next/headers";
import { authBypassEnabled } from "@/lib/authBypass";

export const APP_COOKIE = "app_session";

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function editSessionToken(masterPassword) {
  return sha256Hex(`app-edit:${masterPassword}`);
}

export async function viewSessionToken(viewPassword) {
  return sha256Hex(`app-view:${viewPassword}`);
}

// What role a just-submitted password earns. Master is checked first, so a
// coincidental match with the view password still resolves to the more
// powerful role.
export async function checkAppPassword(settings, submitted) {
  if (settings.masterPassword && submitted === settings.masterPassword) return "edit";
  if (settings.viewPassword && submitted === settings.viewPassword) return "view";
  return null;
}

// Reads the current request's cookie and returns "edit" | "view" | null.
// With neither password configured yet (fresh install), the gate is left
// open (returns "edit") so the first run isn't locked out before anyone can
// set one in Settings.
export async function getRequestAppAccess(settings) {
  if (authBypassEnabled()) return "edit";
  if (!settings.masterPassword && !settings.viewPassword) return "edit";

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(APP_COOKIE)?.value;
  if (!cookieValue) return null;

  if (settings.masterPassword && cookieValue === (await editSessionToken(settings.masterPassword))) return "edit";
  if (settings.viewPassword && cookieValue === (await viewSessionToken(settings.viewPassword))) return "view";
  return null;
}
