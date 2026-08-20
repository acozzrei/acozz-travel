import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { getSettings, updateSettings } from "@/lib/settings";
import { exchangeCode, buildOAuthClient, GMAIL_OAUTH_STATE_COOKIE } from "@/lib/gmail";
import { getRequestSettingsAccess } from "@/lib/settingsAuth";

function redirectUriFor(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api/gmail/callback`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  if (!(await getRequestSettingsAccess())) {
    return NextResponse.redirect(new URL(`/settings/login?next=/settings`, url));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GMAIL_OAUTH_STATE_COOKIE)?.value;

  function withStateCleared(response) {
    response.cookies.set(GMAIL_OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  if (errorParam) {
    return withStateCleared(
      NextResponse.redirect(new URL(`/settings?gmailError=${encodeURIComponent(errorParam)}`, url))
    );
  }
  if (!code) {
    return withStateCleared(NextResponse.redirect(new URL(`/settings?gmailError=missing_code`, url)));
  }
  // Guards against a crafted callback link (using a code from someone else's
  // completed Google consent) being used to hijack this app's Gmail
  // connection — the state must match the one this browser's own
  // /api/gmail/auth-url call set moments earlier.
  if (!expectedState || state !== expectedState) {
    return withStateCleared(NextResponse.redirect(new URL(`/settings?gmailError=invalid_state`, url)));
  }

  try {
    const settings = await getSettings();
    const redirectUri = redirectUriFor(request);
    const tokens = await exchangeCode(settings, redirectUri, code);

    let email = null;
    if (tokens.refresh_token) {
      const client = buildOAuthClient(settings, redirectUri);
      client.setCredentials(tokens);
      const gmail = google.gmail({ version: "v1", auth: client });
      const profile = await gmail.users.getProfile({ userId: "me" });
      email = profile.data.emailAddress;
    }

    await updateSettings({
      gmailRefreshToken: tokens.refresh_token || settings.gmailRefreshToken,
      gmailConnectedEmail: email,
    });

    return withStateCleared(NextResponse.redirect(new URL(`/settings?gmailConnected=1`, url)));
  } catch (err) {
    return withStateCleared(
      NextResponse.redirect(new URL(`/settings?gmailError=${encodeURIComponent(err.message || "oauth_failed")}`, url))
    );
  }
}
