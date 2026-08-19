import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findTripByIdOrSlug } from "@/lib/slug";
import { getRequestTripAccess } from "@/lib/shareAuth";
import { getSettings } from "@/lib/settings";

// Never send the raw trip password over the wire to a view-only session —
// only a full-access session (or the initial page load) gets the actual
// value back, since that's the level allowed to read/change/hand it out.
function serializeTrip(trip, accessLevel) {
  return { ...trip, sharePassword: accessLevel === "full" ? trip.sharePassword : Boolean(trip.sharePassword) };
}

export async function GET(request, { params }) {
  const { id } = await params; // may be the trip's real id or its slug
  const trip = await findTripByIdOrSlug(id, {
    include: { items: { orderBy: { startTime: "asc" } } },
  });
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getSettings();
  const accessLevel = await getRequestTripAccess(trip, settings.masterPassword);
  if (!accessLevel) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }
  return NextResponse.json(serializeTrip(trip, accessLevel));
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const existing = await findTripByIdOrSlug(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getSettings();
  const accessLevel = await getRequestTripAccess(existing, settings.masterPassword);
  // Editing anything about the trip — including its own view-only password
  // — requires full (master) access, not just view access.
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }

  const body = await request.json();
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.destination !== undefined) data.destination = body.destination;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.coverPhoto !== undefined) data.coverPhoto = body.coverPhoto;
  // Empty string clears the trip's own (view-only) password; undefined leaves it untouched.
  if (body.sharePassword !== undefined) data.sharePassword = body.sharePassword === "" ? null : body.sharePassword;

  const trip = await prisma.trip.update({ where: { id: existing.id }, data });
  return NextResponse.json(serializeTrip(trip, accessLevel));
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const existing = await findTripByIdOrSlug(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getSettings();
  const accessLevel = await getRequestTripAccess(existing, settings.masterPassword);
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }
  await prisma.trip.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
