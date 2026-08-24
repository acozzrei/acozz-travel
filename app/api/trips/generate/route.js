import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uniqueTripSlug } from "@/lib/slug";
import { getSettings } from "@/lib/settings";
import { getRequestAppAccess } from "@/lib/appAuth";
import { resolveDestination, searchNearbyPlaces } from "@/lib/placesSearch";
import { generateItinerary } from "@/lib/itineraryGenerator";
import { resolveLocationPhoto } from "@/lib/photos";

export async function POST(request) {
  const body = await request.json();
  const { placeId, destinationName: typedName, startDate, endDate, masterPassword } = body;
  if (!placeId || !startDate || !endDate) {
    return NextResponse.json({ error: "Destination and dates are required." }, { status: 400 });
  }

  const settings = await getSettings();
  const role = await getRequestAppAccess(settings);
  if (role !== "edit") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }
  // Same master-password requirement as any other trip creation — the
  // generator is a shortcut to filling a trip, not a way around it.
  if (!settings.masterPassword) {
    return NextResponse.json({ error: "Set a master password in Settings before creating trips." }, { status: 400 });
  }
  if (masterPassword !== settings.masterPassword) {
    return NextResponse.json({ error: "Incorrect master password." }, { status: 401 });
  }
  if (!settings.googleMapsApiKey) {
    return NextResponse.json({ error: "Add a Google Maps API key in Settings first." }, { status: 400 });
  }
  if (!settings.anthropicApiKey) {
    return NextResponse.json({ error: "Add a Claude (Anthropic) API key in Settings first." }, { status: 400 });
  }

  let destination, restaurants, activities;
  try {
    destination = await resolveDestination(placeId, settings.googleMapsApiKey);
    if (!destination) {
      return NextResponse.json({ error: "Couldn't resolve that destination." }, { status: 400 });
    }
    [restaurants, activities] = await Promise.all([
      searchNearbyPlaces({ lat: destination.lat, lng: destination.lng, type: "restaurant" }, settings.googleMapsApiKey, { limit: 25 }),
      searchNearbyPlaces({ lat: destination.lat, lng: destination.lng, type: "tourist_attraction" }, settings.googleMapsApiKey, { limit: 25 }),
    ]);
  } catch (err) {
    return NextResponse.json({ error: `Google Places error: ${err.message}` }, { status: 502 });
  }
  const destinationName = (typedName || destination.name || "").trim() || destination.formattedAddress;

  let days;
  try {
    days = await generateItinerary({
      destinationName,
      startDate,
      endDate,
      restaurants,
      activities,
      anthropicApiKey: settings.anthropicApiKey,
    });
  } catch (err) {
    return NextResponse.json({ error: `Couldn't generate the itinerary: ${err.message}` }, { status: 502 });
  }

  // Cover photo for the trip itself only — resolving one per generated item
  // (potentially dozens) here would risk the request timing out. Each item
  // already has a "Try to find one" photo link for backfilling afterward.
  let coverPhoto = null;
  const coverResolved = await resolveLocationPhoto({ venueName: destinationName }, settings.googleMapsApiKey);
  if (coverResolved) coverPhoto = coverResolved.photoUrl;

  const itemsData = [];
  let order = 0;
  for (const day of days) {
    for (const item of day.items || []) {
      const startTime = item.time
        ? new Date(`${day.date}T${item.time}:00Z`)
        : new Date(`${day.date}T00:00:00Z`);
      itemsData.push({
        type: item.type || "activity",
        title: (item.title || item.venueName || "Untitled").trim(),
        venueName: item.venueName || null,
        address: item.address || null,
        startTime,
        order: order++,
      });
    }
    if (day.localNote) {
      itemsData.push({
        type: "other",
        title: "Local tip (unverified — check locally)",
        notes: day.localNote,
        startTime: new Date(`${day.date}T23:00:00Z`),
        order: order++,
      });
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
