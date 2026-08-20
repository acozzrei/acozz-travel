import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { APP_COOKIE, checkAppPassword, editSessionToken, viewSessionToken } from "@/lib/appAuth";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  const settings = await getSettings();

  const role = await checkAppPassword(settings, password || "");
  if (!role) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = role === "edit" ? await editSessionToken(settings.masterPassword) : await viewSessionToken(settings.viewPassword);
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(APP_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
