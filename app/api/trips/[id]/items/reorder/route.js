import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadTripAccess } from "@/lib/shareAuth";

// Persists a drag-and-drop reorder of a trip's itinerary — within a day, or
// moving an item to a different day entirely (the client sends the item's
// new startTime when its day changed, keeping the same time-of-day).
export async function POST(request, { params }) {
  const { id } = await params;
  const { trip, accessLevel } = await loadTripAccess(id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }

  const { items } = await request.json().catch(() => ({}));
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  // updateMany with tripId in the where clause so an item id from a
  // different trip can't be smuggled into this trip's reorder.
  await prisma.$transaction(
    items.map((it) =>
      prisma.itineraryItem.updateMany({
        where: { id: it.id, tripId: trip.id },
        data: {
          order: it.order,
          ...(it.startTime !== undefined ? { startTime: it.startTime ? new Date(it.startTime) : null } : {}),
        },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
