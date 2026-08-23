// Local-only escape hatch for clicking through every page while building a
// feature, without logging in repeatedly. Only takes effect when
// DISABLE_PASSWORD_GATE=true is set in your OWN .env — NEVER set this in
// Vercel's environment variables. Every getRequest*Access() helper checks
// this first, so leaving it on locally can't accidentally ship a live,
// unauthenticated deploy: the flag simply won't exist in production unless
// someone deliberately adds it there.
export function authBypassEnabled() {
  return process.env.DISABLE_PASSWORD_GATE === "true";
}
