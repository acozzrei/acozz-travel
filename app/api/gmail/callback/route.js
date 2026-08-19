import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getSettings, updateSettings } from "@/lib/settings";
import { exchangeCode, buildOAuthClient } from "@/lib/gmail";

function redirectUriFor(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api/gmail/callback`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return NextResponse.redirect(new URL(`/settings?gmailError=${encodeURIComponent(errorParam)}`, url));
  }
  if (!code) {
    return NextResponse.redirect(new URL(`/settings?gmailError=missing_code`, url));
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

    return NextResponse.redirect(new URL(`/settings?gmailConnected=1`, url));
  } catch (err) {
    return NextResponse.redirect(
      new URL(`/settings?gmailError=${encodeURIComponent(err.message || "oauth_failed")}`, url)
    );
  }
}
