import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { shareCookieName, shareSessionToken } from "@/lib/shareAuth";

export async function POST(request, { params }) {
  const { token } = await params;
  const { password } = await request.json().catch(() => ({}));

  const trip = await prisma.trip.findUnique({ where: { shareToken: token } });
  if (!trip) {
    return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  }

  if (!trip.sharePassword) {
    return NextResponse.json({ ok: true }); // nothing to check, shouldn't normally happen
  }

  if (password !== trip.sharePassword) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const cookieValue = await shareSessionToken(token, trip.sharePassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(shareCookieName(token), cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
