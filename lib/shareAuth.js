// Two-level password gate for the owner's /trips/[slug] page. Independent
// from lib/settingsAuth.js, which protects the Settings page instead, and
// unrelated to the (password-free) public /share/[slug] link.
//
// Every trip now requires a password. Two different passwords can unlock
// it, at two different access levels:
//   - Settings.masterPassword (configured once, in Settings) -> "full"
//     access: Add/Edit/Delete/Import/Share all work.
//   - Trip.sharePassword (set per-trip, via the trip's own "Trip password"
//     control) -> "view" access: read-only, all of those controls are
//     hidden/blocked.
//
// The session cookie is a hash of (level + trip id + the password that
// earned that level), never the password itself — so it can't be read back
// out of the cookie, and changing either password instantly invalidates
// every session that depended on it, without needing a separate sessions
// table. Uses Web Crypto so it works in both Edge and Node runtimes.

import { cookies } from "next/headers";
import { findTripByIdOrSlug } from "@/lib/slug";
import { getSettings } from "@/lib/settings";
import { authBypassEnabled } from "@/lib/authBypass";

export function shareCookieName(scope) {
  return `share_auth_${scope}`;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function fullSessionToken(scope, masterPassword) {
  return sha256Hex(`trip-full:${scope}:${masterPassword}`);
}

export async function viewSessionToken(scope, viewerPassword) {
  return sha256Hex(`trip-view:${scope}:${viewerPassword}`);
}

// What level of access a just-submitted password earns for this trip.
// Master is checked first, so if a trip's own password happens to match the
// master password too, the more powerful level wins.
export async function checkTripPassword(trip, masterPassword, submitted) {
  if (masterPassword && submitted === masterPassword) return "full";
  if (trip.sharePassword && submitted === trip.sharePassword) return "view";
  return null;
}

// What level of access an existing session cookie grants, by testing it
// against both possible valid tokens for this trip.
export async function getCookieAccessLevel(trip, masterPassword, cookieValue) {
  if (!cookieValue) return null;
  if (masterPassword && cookieValue === (await fullSessionToken(trip.id, masterPassword))) return "full";
  if (trip.sharePassword && cookieValue === (await viewSessionToken(trip.id, trip.sharePassword))) return "view";
  return null;
}

// Reads the current request's cookie for this trip and returns its access
// level ("full" | "view" | null). Shared by every page/API route that reads
// or changes a trip, so the password can't be bypassed by calling the API
// directly instead of going through the login page.
export async function getRequestTripAccess(trip, masterPassword) {
  if (authBypassEnabled()) return "full";
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(shareCookieName(trip.id))?.value;
  return getCookieAccessLevel(trip, masterPassword, cookieValue);
}

// Convenience for API routes that only have a trip id/slug (or need to look
// up the trip owning some other record, like an itinerary item) and just
// want to know "does this request have full access to this trip?" in one
// call. Returns { trip: null, accessLevel: null } if the trip doesn't exist.
export async function loadTripAccess(tripIdOrSlug) {
  const trip = await findTripByIdOrSlug(tripIdOrSlug);
  if (!trip) return { trip: null, accessLevel: null };
  const settings = await getSettings();
  const accessLevel = await getRequestTripAccess(trip, settings.masterPassword);
  return { trip, accessLevel };
}
