import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getAuthUrl, GMAIL_OAUTH_STATE_COOKIE } from "@/lib/gmail";
import { getRequestSettingsAccess } from "@/lib/settingsAuth";

function redirectUriFor(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api/gmail/callback`;
}

export async function GET(request) {
  if (!(await getRequestSettingsAccess())) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }

  const settings = await getSettings();
  // Round-tripped through Google and checked in the callback, so a link to
  // someone else's completed OAuth consent can't be used to silently
  // reconnect this app to a different Gmail account.
  const state = crypto.randomUUID();
  const url = getAuthUrl(settings, redirectUriFor(request), state);
  if (!url) {
    return NextResponse.json(
      { error: "Add a Gmail OAuth Client ID and Secret in Settings first." },
      { status: 400 }
    );
  }
  const res = NextResponse.json({ url });
  res.cookies.set(GMAIL_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // plenty for the OAuth round trip
  });
  return res;
}
