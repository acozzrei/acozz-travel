import { NextResponse } from "next/server";
import { SETTINGS_COOKIE, sessionTokenFor, isValidSettingsPassword } from "@/lib/settingsAuth";
import { getSettings } from "@/lib/settings";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  const settings = await getSettings();

  const valid = await isValidSettingsPassword(password || "", settings.masterPassword);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  if (settings.masterPassword) {
    const token = await sessionTokenFor(settings.masterPassword);
    res.cookies.set(SETTINGS_COOKIE, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  return res;
}
