"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRange } from "@/lib/dates";

// Renders the home page's trip cards. Drag-and-drop reordering (native HTML5
// drag events, no extra dependency) only activates for canReorder — a
// view-only visitor gets the exact same list, in whatever order was last
// set, with no draggable attributes, drag handles, or drag handlers in the
// DOM at all.
export default function TripList({ initialTrips, canReorder }) {
  const [trips, setTrips] = useState(initialTrips);
  const [draggedId, setDraggedId] = useState(null);
  const [error, setError] = useState(null);

  async function persistOrder(nextTrips, previousTrips) {
    try {
      const res = await fetch("/api/trips/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order: nextTrips.map((t) => t.id) }),
      });
      if (!res.ok) throw new Error("Couldn't save the new order");
    } catch {
      setTrips(previousTrips);
      setError("Couldn't save the new order — reverted.");
    }
  }

  function handleDrop(targetId) {
    if (!draggedId || draggedId === targetId) return;
    const previous = trips;
    const next = [...trips];
    const fromIndex = next.findIndex((t) => t.id === draggedId);
    const toIndex = next.findIndex((t) => t.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setTrips(next);
    setDraggedId(null);
    persistOrder(next, previous);
  }

  return (
    <>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {trips.map((trip) => (
          <div
            key={trip.id}
            {...(canReorder
              ? {
                  draggable: true,
                  onDragStart: () => setDraggedId(trip.id),
                  onDragOver: (e) => e.preventDefault(),
                  onDrop: () => handleDrop(trip.id),
                  className: "relative cursor-grab active:cursor-grabbing",
                }
              : {})}
          >
            {canReorder && (
              <span
                className="absolute top-2 right-2 z-10 bg-white/90 rounded-full h-6 w-6 flex items-center justify-center text-stone-500 text-sm pointer-events-none"
                title="Drag to reorder"
              >
                ⠿
              </span>
            )}
            <Link
              href={`/trips/${trip.slug}`}
              className="card overflow-hidden hover:shadow-md transition group block"
            >
              <div className="h-36 bg-gradient-to-br from-teal-500 to-teal-700 relative">
                {trip.coverPhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={trip.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold">{trip.name}</h3>
                {trip.destination && <p className="text-sm text-stone-500">{trip.destination}</p>}
                <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
                  <span>{formatRange(trip.startDate, trip.endDate) || "No dates yet"}</span>
                  <span>{trip._count.items} item{trip._count.items === 1 ? "" : "s"}</span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
