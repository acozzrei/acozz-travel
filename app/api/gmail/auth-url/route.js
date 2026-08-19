import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getAuthUrl } from "@/lib/gmail";

function redirectUriFor(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api/gmail/callback`;
}

export async function GET(request) {
  const settings = await getSettings();
  const url = getAuthUrl(settings, redirectUriFor(request));
  if (!url) {
    return NextResponse.json(
      { error: "Add a Gmail OAuth Client ID and Secret in Settings first." },
      { status: 400 }
    );
  }
  return NextResponse.json({ url });
}
