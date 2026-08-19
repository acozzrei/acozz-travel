import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { createItineraryItem } from "@/lib/items";
import { loadTripAccess } from "@/lib/shareAuth";

export async function POST(request) {
  const body = await request.json();
  const { tripId, candidate } = body;
  if (!tripId || !candidate) {
    return NextResponse.json({ error: "tripId and candidate are required" }, { status: 400 });
  }

  const { trip, accessLevel } = await loadTripAccess(tripId);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }

  const settings = await getSettings();
  const item = await createItineraryItem(trip.id, candidate, settings);
  return NextResponse.json(item, { status: 201 });
}
