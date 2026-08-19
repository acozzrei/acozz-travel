import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { resolveLocationPhoto } from "@/lib/photos";

/** Re-resolves a real location photo for an existing item — useful once a
 * Google Maps API key is added, to backfill items that were created before
 * a key was configured (or in demo mode). */
export async function POST(request, { params }) {
  const { id } = await params;
  const item = await prisma.itineraryItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const settings = await getSettings();
  if (!settings.googleMapsApiKey) {
    return NextResponse.json({ error: "No Google Maps API key configured yet" }, { status: 400 });
  }

  const resolved = await resolveLocationPhoto(
    { venueName: item.venueName, address: item.address },
    settings.googleMapsApiKey
  );
  if (!resolved) {
    return NextResponse.json({ error: "No photo found for this location" }, { status: 404 });
  }

  const updated = await prisma.itineraryItem.update({
    where: { id },
    data: { photoUrl: resolved.photoUrl, photoSource: resolved.photoSource },
  });
  return NextResponse.json(updated);
}
