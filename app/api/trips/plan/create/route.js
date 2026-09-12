import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uniqueTripSlug } from "@/lib/slug";
import { getSettings } from "@/lib/settings";
import { getRequestAppAccess } from "@/lib/appAuth";
import { resolveLocationPhoto } from "@/lib/photos";

// POST /api/trips/plan/create — persists the traveler's picked options from
// a /api/trips/plan proposal as a real trip. The client sends fully-formed
// selections; this route just validates auth and writes them.
export async function POST(request) {
  const body = await request.json();
  const { destinationName, startDate, endDate, masterPassword, partySize, selections } = body;
  if (!destinationName || !startDate || !endDate) {
    return NextResponse.json({ error: "Destination and dates are required." }, { status: 400 });
  }
  if (!Array.isArray(selections) || selections.length === 0) {
    return NextResponse.json({ error: "Pick at least one option first." }, { status: 400 });
  }

  const settings = await getSettings();
  const role = await getRequestAppAccess(settings);
  if (role !== "edit") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }
  if (!settings.masterPassword) {
    return NextResponse.json({ error: "Set a master password in Settings before creating trips." }, { status: 400 });
  }
  if (masterPassword !== settings.masterPassword) {
    return NextResponse.json({ error: "Incorrect master password." }, { status: 401 });
  }

  const party = Math.max(1, Math.min(20, Number(partySize) || 2));
  const kindToType = {
    meal: "dinner", // refined below per mealType
    activity: "activity",
    lodging: "lodging",
    flight: "transport",
  };

  const itemsData = [];
  let order = 0;
  for (const s of selections) {
    let type = kindToType[s.kind] || "other";
    if (s.kind === "meal") {
      type = s.mealType === "breakfast" ? "breakfast" : s.mealType === "lunch" ? "lunch" : "dinner";
    }
    const startTime = s.date && s.time
      ? new Date(`${s.date}T${s.time}:00Z`)
      : s.date
        ? new Date(`${s.date}T00:00:00Z`)
        : null;
    const endTime = s.endDate ? new Date(`${s.endDate}T00:00:00Z`) : null;
    itemsData.push({
      type,
      title: (s.title || s.name || "Untitled").trim(),
      venueName: s.venueName || s.name || null,
      address: s.address || null,
      startTime,
      endTime,
      partySize: s.kind === "lodging" ? null : party,
      notes: s.costNote ? `${s.costNote}${s.kind !== "lodging" && s.kind !== "flight" ? ` × ${party} travelers` : ""}` : null,
      estimatedCost: typeof s.estimatedCost === "number" ? s.estimatedCost : null,
      bookingUrl: s.bookingUrl || null,
      photoUrl: s.photoUrl || null,
      photoSource: s.photoSource || null,
      order: order++,
    });
  }

  let coverPhoto = null;
  if (settings.googleMapsApiKey) {
    try {
      const coverResolved = await resolveLocationPhoto({ venueName: destinationName }, settings.googleMapsApiKey);
      if (coverResolved) coverPhoto = coverResolved.photoUrl;
    } catch {
      // Cover photo is a nice-to-have; a failure here shouldn't block the trip.
    }
  }

  const { _max } = await prisma.trip.aggregate({ _max: { order: true } });
  const tripOrder = (_max.order ?? -1) + 1;
  const slug = await uniqueTripSlug(destinationName);

  const trip = await prisma.trip.create({
    data: {
      name: destinationName,
      slug,
      destination: destinationName,
      startDate: new Date(`${startDate}T00:00:00Z`),
      endDate: new Date(`${endDate}T00:00:00Z`),
      coverPhoto,
      order: tripOrder,
      items: { create: itemsData },
    },
    include: { items: true },
  });

  return NextResponse.json(trip, { status: 201 });
}
