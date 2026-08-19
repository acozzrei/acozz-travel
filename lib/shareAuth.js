// Optional password gate for the owner's own /trips/[slug] page. Independent
// from lib/settingsAuth.js, which protects the Settings page instead, and
// unrelated to the (password-free) public /share/[slug] link. A trip with no
// sharePassword set stays open.
//
// `scope` uniquely identifies what's being protected — currently always the
// trip's own id, kept as a distinct concept from the trip id itself so a
// cookie can't be replayed against some other scope in the future.

import { cookies } from "next/headers";

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

// The cookie is a hash of the scope + password together (not the password
// alone), so a valid session for one trip (or one entry point) can't be
// reused on another trip/entry point that happens to share the same password.
export async function shareSessionToken(scope, password) {
  return sha256Hex(`share-session:${scope}:${password}`);
}

export async function isValidShareSession(scope, password, cookieValue) {
  if (!password) return true; // no password required for this trip
  if (!cookieValue) return false;
  const expected = await shareSessionToken(scope, password);
  return cookieValue === expected;
}

// Shared by every API route that reads or changes a password-protected trip
// (not just the page render), so the password can't be bypassed by calling
// the API directly instead of going through the login page.
export async function isAuthedForTrip(trip) {
  if (!trip.sharePassword) return true;
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(shareCookieName(trip.id))?.value;
  return isValidShareSession(trip.id, trip.sharePassword, cookieValue);
}
