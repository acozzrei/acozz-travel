import { NextResponse } from "next/server";
import { findTripByIdOrSlug } from "@/lib/slug";
import { shareCookieName, shareSessionToken } from "@/lib/shareAuth";

export async function POST(request, { params }) {
  const { id } = await params; // may be the trip's real id or its slug
  const { password } = await request.json().catch(() => ({}));

  const trip = await findTripByIdOrSlug(id);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!trip.sharePassword) {
    return NextResponse.json({ ok: true }); // nothing to check, shouldn't normally happen
  }

  if (password !== trip.sharePassword) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const cookieValue = await shareSessionToken(trip.id, trip.sharePassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(shareCookieName(trip.id), cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
