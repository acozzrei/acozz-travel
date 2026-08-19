import { NextResponse } from "next/server";
import { findTripByIdOrSlug } from "@/lib/slug";
import { getSettings } from "@/lib/settings";
import { shareCookieName, checkTripPassword, fullSessionToken, viewSessionToken } from "@/lib/shareAuth";

export async function POST(request, { params }) {
  const { id } = await params; // may be the trip's real id or its slug
  const { password } = await request.json().catch(() => ({}));

  const trip = await findTripByIdOrSlug(id);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const settings = await getSettings();
  const level = await checkTripPassword(trip, settings.masterPassword, password);
  if (!level) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const cookieValue =
    level === "full"
      ? await fullSessionToken(trip.id, settings.masterPassword)
      : await viewSessionToken(trip.id, trip.sharePassword);
  const res = NextResponse.json({ ok: true, level });
  res.cookies.set(shareCookieName(trip.id), cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
