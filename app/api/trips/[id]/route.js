import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findTripByIdOrSlug } from "@/lib/slug";
import { isAuthedForTrip } from "@/lib/shareAuth";

// Never send the raw password over the wire — the front end only ever needs
// to know whether one is set (to show "Trip password ✓" vs. "Trip password"),
// never the value itself.
function serializeTrip(trip) {
  return { ...trip, sharePassword: Boolean(trip.sharePassword) };
}

export async function GET(request, { params }) {
  const { id } = await params; // may be the trip's real id or its slug
  const trip = await findTripByIdOrSlug(id, {
    include: { items: { orderBy: { startTime: "asc" } } },
  });
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await isAuthedForTrip(trip))) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }
  return NextResponse.json(serializeTrip(trip));
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const existing = await findTripByIdOrSlug(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Gate on the CURRENT password before allowing any change, including
  // clearing/changing the password itself — otherwise anyone who knows the
  // URL could call this directly and strip the password without ever
  // knowing it.
  if (!(await isAuthedForTrip(existing))) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }

  const body = await request.json();
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.destination !== undefined) data.destination = body.destination;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.coverPhoto !== undefined) data.coverPhoto = body.coverPhoto;
  // Empty string clears the share password; undefined leaves it untouched.
  if (body.sharePassword !== undefined) data.sharePassword = body.sharePassword === "" ? null : body.sharePassword;

  const trip = await prisma.trip.update({ where: { id: existing.id }, data });
  return NextResponse.json(serializeTrip(trip));
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const existing = await findTripByIdOrSlug(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await isAuthedForTrip(existing))) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }
  await prisma.trip.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
