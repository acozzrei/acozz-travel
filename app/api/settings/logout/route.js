import { NextResponse } from "next/server";
import { SETTINGS_COOKIE } from "@/lib/settingsAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SETTINGS_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
