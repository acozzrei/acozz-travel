// Heuristic parsers that turn a raw Gmail message into a candidate itinerary
// item. Each parser returns null if the message doesn't match its pattern,
// so the caller can try the next one. A generic heuristic + optional
// Claude-assisted parser catch everything else.

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const MONTH_ABBR = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";

/** Strips HTML down to a plain-text-ish string, using " | " as a block
 * separator so downstream regexes can anchor on structure without needing
 * to understand markup. */
export function htmlToText(html) {
  if (!html) return "";
  let text = html;
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<(br|\/p|\/div|\/tr|\/li)[^>]*>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " | ");
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#xA0;/g, " ")
    .replace(/&zwnj;/g, "");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/(\s*\|\s*){2,}/g, " | ");
  return text.trim();
}

const MONTH_NAMES = MONTHS.split("|");
// Exactly 12 standard three-letter abbreviations, aligned index-for-index
// with MONTH_NAMES. ("Sept" is handled by matching on the first 3 letters
// below, not by adding a 13th entry that would shift every later index.)
const MONTH_ABBR_LIST = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthIndexFromName(monthName) {
  const n = monthName.toLowerCase();
  let idx = MONTH_NAMES.findIndex((m) => m.toLowerCase() === n);
  if (idx !== -1) return idx;
  return MONTH_ABBR_LIST.findIndex((m) => m.toLowerCase() === n.slice(0, 3));
}

function toDate(year, monthName, day, timeStr) {
  const monthIdx = monthIndexFromName(monthName);
  if (monthIdx === -1) return null;
  let hours = 0, minutes = 0;
  const timeMatch = timeStr && timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const isPm = /pm/i.test(timeMatch[3]);
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
  }
  // Built with Date.UTC (not `new Date(y,m,d,h,m)`) so the resulting instant
  // doesn't depend on the server process's own timezone. The app's
  // convention is to store the destination's wall-clock time using UTC as
  // the storage timezone, and to always render it back out in UTC — see
  // the matching comments in the display components.
  return new Date(Date.UTC(Number(year), monthIdx, Number(day), hours, minutes));
}

/** OpenTable confirmation / change / cancellation emails. */
export function parseOpenTable({ text, subject, sender }) {
  if (!/opentable\.com/i.test(sender || "")) return null;
  if (/still going to make it|let .* know you are coming/i.test(subject || "")) return null; // reminder, not a new booking

  const headerMatch = text.match(
    new RegExp(
      `Thanks for using OpenTable!\\s*\\|\\s*([^|]+?)\\s*\\|\\s*([^|]+?)\\s+on\\s+(\\w+),\\s+(${MONTHS}|${MONTH_ABBR})\\s+(\\d{1,2}),\\s+(\\d{4})\\s+at\\s+([\\d: ]+[ap]m)`,
      "i"
    )
  );
  if (!headerMatch) return null;

  const [, venue, description, , month, day, year, time] = headerMatch;
  const partyMatch = description.match(/for\s+(\d+)/i);
  // The address block is one pipe-delimited cell that may contain an
  // internal line break between the street and city/postal line (from a
  // <br> in the original email), e.g. "65 N Church St\nGeorge Town, ...".
  const addrMatch = text.match(/Get directions\s*\|\s*([^|]+?)\s*\|\s*Phone:\s*([^|]+)/i);
  const confMatch = text.match(/Confirmation #\s*\|\s*:\s*\|\s*(\S+)/i);

  let status = "confirmed";
  if (/cancel/i.test(subject || "")) status = "canceled";
  else if (/change/i.test(subject || "")) status = "changed";

  return {
    type: "dinner",
    title: venue.trim(),
    venueName: venue.trim(),
    description: description.trim(),
    address: addrMatch ? addrMatch[1].replace(/\s*\n\s*/g, ", ").trim() : null,
    phone: addrMatch ? addrMatch[2].trim() : null,
    partySize: partyMatch ? Number(partyMatch[1]) : null,
    confirmationNo: confMatch ? confMatch[1] : null,
    startTime: toDate(year, month, day, time),
    status,
    source: "OpenTable",
  };
}

/** SIXT car rental booking confirmations. */
export function parseSixt({ text, subject, sender }) {
  if (!/sixt\.com/i.test(sender || "")) return null;
  if (!/booking is confirmed|your itinerary/i.test(text)) return null;

  const pickupMatch = text.match(/Pickup on\s+([A-Za-z]+ \d{1,2},? \d{4})\s+at\s+([\d: ]+[ap]m)\s*\n+\s*([^\n]+)/i);
  const returnMatch = text.match(/Return on\s+([A-Za-z]+ \d{1,2},? \d{4})\s+at\s+([\d: ]+[ap]m)\s*\n+\s*([^\n]+)/i);
  const confMatch = subject && subject.match(/#(\S+)/);
  const categoryMatch = text.match(/Your booked category is\s+([^\n]+)/i);

  if (!pickupMatch) return null;

  const parseLoose = (dateStr, timeStr) => {
    const m = dateStr.match(new RegExp(`(${MONTHS}|${MONTH_ABBR})\\s+(\\d{1,2}),?\\s+(\\d{4})`, "i"));
    if (!m) return null;
    return toDate(m[3], m[1], m[2], timeStr);
  };

  return {
    type: "transport",
    title: `Rental car pickup${categoryMatch ? ` — ${categoryMatch[1].trim()}` : ""}`,
    venueName: pickupMatch[3].trim(),
    address: pickupMatch[3].trim(),
    notes: returnMatch
      ? `Return ${returnMatch[1]} at ${returnMatch[2].trim()} — ${returnMatch[3].trim()}`
      : null,
    confirmationNo: confMatch ? confMatch[1] : null,
    startTime: parseLoose(pickupMatch[1], pickupMatch[2]),
    endTime: returnMatch ? parseLoose(returnMatch[1], returnMatch[2]) : null,
    status: "confirmed",
    source: "Sixt",
  };
}

const STREET_WORD = /\b\d+[A-Za-z]?\s+[A-Za-z0-9'.,\- ]*(Road|Rd|Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Way|Lane|Ln|Circle|Cir|Highway|Hwy|Point|Place|Pl)\b/i;
const POSTAL_WORD = /\b([A-Z]{1,2}\d[A-Z\d]?[- ]?\d{3,4}|\d{5}(-\d{4})?)\b/;

/** Generic heuristic fallback for reservation-style emails that don't match
 * a known sender template (small businesses, personal confirmations, etc). */
export function parseGeneric({ text, plaintext, subject, sender }) {
  const body = plaintext || text;
  if (!body) return null;

  const dateTimeMatch = body.match(
    new RegExp(
      // After the day number, skip over an optional weekday name (with or
      // without a trailing comma, in or out of parens) before "at <time>",
      // e.g. "October 15th, Thursday at 6:30pm" or "May 3 (Fri) 6:30pm".
      `(?:on|for)\\s+(${MONTHS}|${MONTH_ABBR})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?[,\\s]*(?:\\(?[A-Za-z]+\\)?[,\\s]*)?(?:at\\s+)?([\\d:]{1,5}\\s*[ap]m)`,
      "i"
    )
  );
  if (!dateTimeMatch) return null;

  const [, month, day, time] = dateTimeMatch;
  const yearMatch = body.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());

  const partyMatch = body.match(/for\s+(\d+)\s*(?:people|guests|persons|adults)/i);

  let venueName = null;
  const dineMatch = body.match(/(?:dine at|dining at|table at|reservation at|stay at|staying at|choosing)\s+([A-Z][A-Za-z0-9'&\-. ]{2,60}?)[.,\n]/);
  if (dineMatch) venueName = dineMatch[1].trim();
  if (!venueName && subject && subject.length < 60 && !/re:|fwd:/i.test(subject)) {
    venueName = subject.trim();
  }

  // Look for a short block of consecutive lines that reads like a mailing
  // address (street + a line with a postal/zip-like token).
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  let address = null;
  for (let i = 0; i < lines.length; i++) {
    if (STREET_WORD.test(lines[i])) {
      const block = [lines[i]];
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        if (POSTAL_WORD.test(lines[j]) || /island|city|county|,/.test(lines[j].toLowerCase())) {
          block.push(lines[j]);
        } else break;
      }
      address = block.join(", ");
      break;
    }
  }

  return {
    type: /dine|dinner|restaurant|table/i.test(body) ? "dinner" : "activity",
    title: venueName || subject || "Reservation",
    venueName,
    address,
    partySize: partyMatch ? Number(partyMatch[1]) : null,
    startTime: toDate(year, month, day, time),
    status: /cancel/i.test(subject || "") ? "canceled" : "confirmed",
    source: "Email",
  };
}

/** Known promo/loyalty senders whose mail should never be treated as a
 * booking candidate, even if it mentions dates or hotel names. */
const PROMO_SENDER_PATTERN = /bonvoy|loyalty\.hyatt|mc\.ihg|email\.point\.me|e\.allegiant\.com|eg\.expedia\.com|news\.archerhotel|noreply-accounts@google/i;

export function looksLikePromo({ sender, subject, text }) {
  if (PROMO_SENDER_PATTERN.test(sender || "")) return true;
  if (/unsubscribe/i.test(text || "") && /% off|bonus points|earn up to|save up to|member savings|deal|offer ends|welcome offer/i.test(subject + " " + text)) {
    return true;
  }
  if (/tell us about your stay|rate your stay|survey/i.test(subject || "")) return true;
  return false;
}
