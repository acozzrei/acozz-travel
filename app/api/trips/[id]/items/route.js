import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { createItineraryItem } from "@/lib/items";
import { loadTripAccess } from "@/lib/shareAuth";

export async function POST(request, { params }) {
  const { id: tripId } = await params;

  const { trip, accessLevel } = await loadTripAccess(tripId);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const settings = await getSettings();
  const item = await createItineraryItem(trip.id, body, settings);
  return NextResponse.json(item, { status: 201 });
}
