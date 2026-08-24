import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getRequestAppAccess } from "@/lib/appAuth";
import { searchDestinations } from "@/lib/placesSearch";

export async function GET(request) {
  const settings = await getSettings();
  const role = await getRequestAppAccess(settings);
  if (role !== "edit") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }
  if (!settings.googleMapsApiKey) {
    return NextResponse.json({ error: "Add a Google Maps API key in Settings first." }, { status: 400 });
  }

  const q = new URL(request.url).searchParams.get("q") || "";
  try {
    const results = await searchDestinations(q, settings.googleMapsApiKey);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: `Google Places error: ${err.message}` }, { status: 502 });
  }
}
