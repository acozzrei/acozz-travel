import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { createItineraryItem } from "@/lib/items";

export async function POST(request) {
  const body = await request.json();
  const { tripId, candidate } = body;
  if (!tripId || !candidate) {
    return NextResponse.json({ error: "tripId and candidate are required" }, { status: 400 });
  }
  const settings = await getSettings();
  const item = await createItineraryItem(tripId, candidate, settings);
  return NextResponse.json(item, { status: 201 });
}
