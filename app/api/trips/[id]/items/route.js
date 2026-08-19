import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { createItineraryItem } from "@/lib/items";

export async function POST(request, { params }) {
  const { id: tripId } = await params;
  const body = await request.json();

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const settings = await getSettings();
  const item = await createItineraryItem(tripId, body, settings);
  return NextResponse.json(item, { status: 201 });
}
