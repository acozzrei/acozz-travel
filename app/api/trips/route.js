import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uniqueTripSlug } from "@/lib/slug";
import { getSettings } from "@/lib/settings";
import { resolveLocationPhoto } from "@/lib/photos";

export async function GET() {
  const trips = await prisma.trip.findMany({
    orderBy: { startDate: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json(trips);
}

export async function POST(request) {
  const body = await request.json();
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Trip name is required" }, { status: 400 });
  }

  // Creating a trip requires the master (full-access) password — otherwise
  // anyone with the site URL could spin up new trips even though every
  // existing trip is password-gated.
  const settings = await getSettings();
  if (!settings.masterPassword) {
    return NextResponse.json({ error: "Set a master password in Settings before creating trips." }, { status: 400 });
  }
  if (body.masterPassword !== settings.masterPassword) {
    return NextResponse.json({ error: "Incorrect master password." }, { status: 401 });
  }

  // Auto-fill a cover photo from the destination (falling back to the trip
  // name) the same way itinerary items already get real photos, unless one
  // was explicitly supplied.
  let coverPhoto = body.coverPhoto || null;
  if (!coverPhoto && settings.googleMapsApiKey) {
    const query = body.destination?.trim() || body.name.trim();
    const resolved = await resolveLocationPhoto({ venueName: query }, settings.googleMapsApiKey);
    if (resolved) coverPhoto = resolved.photoUrl;
  }

  const slug = await uniqueTripSlug(body.name.trim());
  const trip = await prisma.trip.create({
    data: {
      name: body.name.trim(),
      slug,
      destination: body.destination || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      coverPhoto,
    },
  });
  return NextResponse.json(trip, { status: 201 });
}
