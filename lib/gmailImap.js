import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { parseBookingEmail, htmlToText } from "@/lib/gmail";

// Same candidate search as the OAuth Gmail API path, but expressed for
// Gmail's X-GM-RAW IMAP extension, which accepts the web search operators.
const SEARCH_QUERY =
  '(category:reservations OR from:opentable.com OR from:sixt.com OR from:airbnb.com OR from:resy.com OR from:viator.com OR from:eventbrite.com OR subject:(reservation OR confirmed OR confirmation OR itinerary OR "table for" OR "booking is confirmed")) -subject:(survey OR unsubscribe OR "rate your stay") newer_than:270d';

function newClient(email, password) {
  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    logger: false,
    auth: { user: email, pass: password },
  });
}

function friendlyError(err) {
  const msg = String(err?.message || err || "");
  if (/invalid credentials|authentication failed|auth failed|AUTHENTICATIONFAILED/i.test(msg)) {
    return new Error(
      "Gmail rejected the login. Double-check the address, and make sure you're using an App Password " +
        "(the 16-character code from myaccount.google.com/apppasswords), not your regular Google password. " +
        "App passwords need 2-Step Verification turned on."
    );
  }
  if (/timed out|timeout|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(msg)) {
    return new Error("Couldn't reach imap.gmail.com. Check your connection and try again.");
  }
  return new Error(msg.replace(/^Error:\s*/, "").slice(0, 300) || "IMAP connection failed.");
}

/** Verifies a Gmail address + app password by logging in and straight back out. */
export async function testImapLogin(email, password) {
  const client = newClient(email, password);
  try {
    await client.connect();
  } catch (err) {
    throw friendlyError(err);
  } finally {
    try {
      await client.logout();
    } catch {
      // Already closed / never connected — nothing to do.
    }
  }
  return true;
}

/** Pulls candidate booking/reservation emails over IMAP and runs them
 * through the same parser pipeline as the OAuth path. Returns structured
 * candidates ready to review and import into a trip. */
export async function scanImapForBookingCandidates(email, password, settings, { maxResults = 40 } = {}) {
  const client = newClient(email, password);
  try {
    await client.connect();
  } catch (err) {
    throw friendlyError(err);
  }

  const candidates = [];
  try {
    await client.mailboxOpen("INBOX");
    const uids = await client.search({ "X-GM-RAW": SEARCH_QUERY }, { uid: true });
    // Newest first.
    const take = uids.slice(-maxResults).reverse();

    for (const uid of take) {
      let raw;
      try {
        const fetched = await client.fetchOne(uid, { bodyParts: [""] });
        raw = fetched?.bodyParts?.get("");
      } catch {
        continue; // Skip one bad message rather than failing the whole scan.
      }
      if (!raw) continue;

      let parsedMail;
      try {
        parsedMail = await simpleParser(raw);
      } catch {
        continue;
      }

      const subject = parsedMail.subject || "";
      const sender = parsedMail.from?.value?.[0]?.address || "";
      // Reuse the shared pipeline: promo filter, OpenTable/Sixt templates,
      // optional Claude extraction, generic fallback.
      const bodyText = parsedMail.html ? htmlToText(parsedMail.html) : parsedMail.text || "";
      const parsed = await parseBookingEmail(
        { text: bodyText, plaintext: parsedMail.text || "", subject, sender },
        settings
      );
      if (!parsed) continue;

      const receivedAt = parsedMail.date ? new Date(parsedMail.date).getTime() : Date.now();
      candidates.push({
        gmailMsgId: `imap:${uid}`,
        sender,
        subject,
        snippet: bodyText.slice(0, 160),
        receivedAt: Number.isFinite(receivedAt) ? receivedAt : Date.now(),
        ...parsed,
      });
    }
  } finally {
    try {
      await client.logout();
    } catch {
      // Ignore logout errors after a successful scan.
    }
  }

  return { connected: true, candidates };
}
