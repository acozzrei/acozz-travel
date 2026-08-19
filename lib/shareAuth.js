// Optional password gate for an individual shared trip link (/share/[token]).
// Independent from lib/settingsAuth.js — this protects a single trip's public
// link, not the owner's Settings page. A trip with no sharePassword set stays
// open to anyone with the link, same as before this feature existed.

export function shareCookieName(token) {
  return `share_auth_${token}`;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// The cookie is a hash of the token + password together (not the password
// alone), so a valid session for one trip's link can't be reused on another
// trip that happens to share the same password.
export async function shareSessionToken(token, password) {
  return sha256Hex(`share-session:${token}:${password}`);
}

export async function isValidShareSession(token, password, cookieValue) {
  if (!password) return true; // no password required for this trip
  if (!cookieValue) return false;
  const expected = await shareSessionToken(token, password);
  return cookieValue === expected;
}
