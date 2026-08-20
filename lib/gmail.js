import { google } from "googleapis";
import { htmlToText, parseOpenTable, parseSixt, parseGeneric, looksLikePromo } from "@/lib/gmailParsers";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

// Name of the short-lived cookie that carries the OAuth CSRF `state` value
// between /api/gmail/auth-url (which sets it) and /api/gmail/callback
// (which checks it), so a link to someone else's completed Google consent
// can't be replayed to silently reconnect this app to a different account.
export const GMAIL_OAUTH_STATE_COOKIE = "gmail_oauth_state";

export function buildOAuthClient(settings, redirectUri) {
  if (!settings.gmailClientId || !settings.gmailClientSecret) return null;
  return new google.auth.OAuth2(settings.gmailClientId, settings.gmailClientSecret, redirectUri);
}

export function getAuthUrl(settings, redirectUri, state) {
  const client = buildOAuthClient(settings, redirectUri);
  if (!client) return null;
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCode(settings, redirectUri, code) {
  const client = buildOAuthClient(settings, redirectUri);
  if (!client) throw new Error("Gmail OAuth client not configured");
  const { tokens } = await client.getToken(code);
  return tokens; // { refresh_token, access_token, ... }
}

function gmailClient(settings, redirectUri) {
  const client = buildOAuthClient(settings, redirectUri);
  if (!client || !settings.gmailRefreshToken) return null;
  client.setCredentials({ refresh_token: settings.gmailRefreshToken });
  return google.gmail({ version: "v1", auth: client });
}

const SEARCH_QUERY =
  '(category:reservations OR from:opentable.com OR from:sixt.com OR from:airbnb.com OR from:resy.com OR from:viator.com OR from:eventbrite.com OR subject:(reservation OR confirmed OR confirmation OR itinerary OR "table for" OR "booking is confirmed")) -subject:(survey OR unsubscribe OR "rate your stay") newer_than:270d';

/** Pulls candidate booking/reservation emails from Gmail and runs them
 * through the parser pipeline. Returns structured candidates ready to
 * review and import into a trip. */
export async function scanForBookingCandidates(settings, redirectUri, { maxResults = 40 } = {}) {
  const gmail = gmailClient(settings, redirectUri);
  if (!gmail) return { connected: false, candidates: [] };

  const list = await gmail.users.messages.list({
    userId: "me",
    q: SEARCH_QUERY,
    maxResults,
  });

  const messages = list.data.messages || [];
  const candidates = [];

  for (const m of messages) {
    const full = await gmail.users.messages.get({ userId: "me", id: m.id, format: "full" });
    const parsed = await parseGmailApiMessage(full.data, settings);
    if (!parsed) continue;
    candidates.push(parsed);
  }

  return { connected: true, candidates };
}

function findBody(payload, mimeType) {
  if (!payload) return null;
  if (payload.mimeType === mimeType && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  for (const part of payload.parts || []) {
    const found = findBody(part, mimeType);
    if (found) return found;
  }
  return null;
}

function headerValue(headers, name) {
  const h = (headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : "";
}

export async function parseGmailApiMessage(message, settings) {
  const headers = message.payload?.headers || [];
  const subject = headerValue(headers, "Subject");
  const from = headerValue(headers, "From");
  const senderMatch = from.match(/<([^>]+)>/);
  const sender = senderMatch ? senderMatch[1] : from;

  const html = findBody(message.payload, "text/html");
  const plaintext = findBody(message.payload, "text/plain");
  const text = html ? htmlToText(html) : plaintext || "";

  if (looksLikePromo({ sender, subject, text: plaintext || text })) return null;

  const input = { text, plaintext, subject, sender };
  let parsed = parseOpenTable(input) || parseSixt(input);
  if (!parsed && settings?.anthropicApiKey) {
    parsed = await parseWithClaude(input, settings.anthropicApiKey);
  }
  if (!parsed) parsed = parseGeneric(input);
  if (!parsed) return null;

  return {
    gmailMsgId: message.id,
    sender,
    subject,
    snippet: message.snippet,
    receivedAt: Number(message.internalDate),
    ...parsed,
  };
}

/** Optional higher-accuracy extraction for emails that don't match a known
 * template, using the Claude API. Falls back to null (letting the caller
 * use the regex heuristic) on any error so a bad/missing key never breaks
 * the import flow. */
async function parseWithClaude(input, apiKey) {
  const body = (input.plaintext || input.text || "").slice(0, 6000);
  if (!body.trim()) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `You extract structured booking details from confirmation emails for a travel itinerary app. Read the email below and respond with ONLY a JSON object (no prose, no markdown fences) with these fields: type (one of "dinner","activity","event","lodging","transport","other"), title (short, e.g. venue/business name), venueName, address (full postal address if present, else null), startTime (the booking's date/time exactly as a local wall-clock value at the venue, formatted as "YYYY-MM-DDTHH:MM:00Z" — use the literal "Z" suffix regardless of the venue's real timezone, treating Z as a placeholder for "this venue's local time", NOT converting to true UTC; include the year even if the email omits it, inferring the most plausible one; null if no date/time found), endTime (same format, or null), partySize (integer or null), confirmationNo (string or null), status (one of "confirmed","canceled","changed","pending"). If this email is not a genuine booking/reservation confirmation (e.g. it's a marketing email, newsletter, or unrelated message), respond with {"notABooking": true}.

Subject: ${input.subject}
From: ${input.sender}

Email body:
${body}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.content?.[0]?.text?.trim();
    if (!raw) return null;
    const jsonStr = raw.replace(/^```json\s*/i, "").replace(/```$/, "");
    const obj = JSON.parse(jsonStr);
    if (obj.notABooking) return null;
    return {
      type: obj.type || "activity",
      title: obj.title || obj.venueName || input.subject,
      venueName: obj.venueName || null,
      address: obj.address || null,
      partySize: obj.partySize ?? null,
      confirmationNo: obj.confirmationNo ?? null,
      startTime: obj.startTime ? new Date(obj.startTime) : null,
      endTime: obj.endTime ? new Date(obj.endTime) : null,
      status: obj.status || "confirmed",
      source: "Claude",
    };
  } catch {
    return null;
  }
}

export { SCOPES };
