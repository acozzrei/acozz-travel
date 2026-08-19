import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { scanForBookingCandidates } from "@/lib/gmail";
import { DEMO_GMAIL_CANDIDATES } from "@/lib/demoData";

function redirectUriFor(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api/gmail/callback`;
}

export async function POST(request) {
  const settings = await getSettings();
  const alreadyImported = new Set((await prisma.importedEmail.findMany()).map((r) => r.gmailMsgId));

  const isLive = Boolean(settings.gmailRefreshToken && settings.gmailClientId && settings.gmailClientSecret);

  let candidates;
  let mode;
  if (isLive) {
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
  return NextResponse.json({ mode, candidates: fresh, connectedEmail: settings.gmailConnectedEmail });
}
