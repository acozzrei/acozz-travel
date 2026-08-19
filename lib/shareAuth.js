// Optional password gate for an individual trip's content — used for both
// the public /share/[token] link AND the owner's own /trips/[id] page, so the
// same password protects a trip's data no matter which URL someone uses to
// reach it. Independent from lib/settingsAuth.js, which protects the
// Settings page instead. A trip with no sharePassword set stays open, same
// as before this feature existed.
//
// `scope` is whatever uniquely identifies the entry point being protected —
// the share token for /share/[token], or the trip's own id for /trips/[id].
// Using a different scope for each keeps a login on one from being reusable
// on the other, even though both check the same underlying trip.sharePassword.

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
