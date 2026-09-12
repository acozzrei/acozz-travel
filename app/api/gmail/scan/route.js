import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { scanForBookingCandidates } from "@/lib/gmail";
import { scanImapForBookingCandidates } from "@/lib/gmailImap";
import { decryptSecret } from "@/lib/imapSecrets";
import { DEMO_GMAIL_CANDIDATES } from "@/lib/demoData";
import { loadTripAccess } from "@/lib/shareAuth";

function redirectUriFor(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api/gmail/callback`;
}

export async function POST(request) {
  const { tripId } = await request.json().catch(() => ({}));
  const { trip, accessLevel } = await loadTripAccess(tripId);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }

  const settings = await getSettings();
  const alreadyImported = new Set((await prisma.importedEmail.findMany()).map((r) => r.gmailMsgId));

  // Prefer the simple IMAP login; fall back to the legacy OAuth connection.
  const imapLive = Boolean(settings.gmailImapEmail && settings.gmailImapPasswordEnc);
  const oauthLive = Boolean(settings.gmailRefreshToken && settings.gmailClientId && settings.gmailClientSecret);

  let candidates;
  let mode;
  if (imapLive) {
    try {
      const password = decryptSecret(settings.gmailImapPasswordEnc);
      const result = await scanImapForBookingCandidates(settings.gmailImapEmail, password, settings);
      candidates = result.candidates;
      mode = "live";
    } catch (err) {
      return NextResponse.json(
        { error: `Couldn't reach Gmail: ${err.message || err}` },
        { status: 502 }
      );
    }
  } else if (oauthLive) {
    try {
      const result = await scanForBookingCandidates(settings, redirectUriFor(request));
      candidates = result.candidates;
      mode = "live";
    } catch (err) {
      return NextResponse.json(
        { error: `Couldn't reach Gmail: ${err.message || err}` },
        { status: 502 }
      );
    }
  } else {
    candidates = DEMO_GMAIL_CANDIDATES;
    mode = "demo";
  }

  const fresh = candidates.filter((c) => !alreadyImported.has(c.gmailMsgId));
  return NextResponse.json({
    mode,
    candidates: fresh,
    connectedEmail: settings.gmailImapEmail || settings.gmailConnectedEmail,
  });
}
