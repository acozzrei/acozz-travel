import { NextResponse } from "next/server";
import { SETTINGS_COOKIE, isValidPassword, sessionTokenFor, settingsAuthEnabled } from "@/lib/settingsAuth";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));

  if (!settingsAuthEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const valid = await isValidPassword(password || "");
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await sessionTokenFor(process.env.SETTINGS_PASSWORD);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SETTINGS_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
