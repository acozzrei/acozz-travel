import { NextResponse } from "next/server";
import { findTripByIdOrSlug } from "@/lib/slug";
import { shareCookieName } from "@/lib/shareAuth";

// Clears whichever access level (full or view) this trip's session cookie
// currently holds, so the next visit to /trips/[slug] prompts for a
// password again — the only way to switch levels, since there's no way to
// "downgrade" or "upgrade" an existing session in place.
export async function POST(request, { params }) {
  const { id } = await params;
  const trip = await findTripByIdOrSlug(id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(shareCookieName(trip.id), "", { path: "/", maxAge: 0 });
  return res;
}
