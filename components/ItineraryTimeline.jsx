"use client";

import ItemCard from "@/components/ItemCard";
import { dayKey, dayLabel } from "@/lib/dates";

// Groups items by destination-local calendar day and renders the timeline.
// Shared by the owner's trip page (with edit/delete/photo handlers) and the
// public read-only share page (handlers omitted, so ItemCard renders
// without owner controls).
export default function ItineraryTimeline({ items, onEdit, onDelete, onResolvePhoto }) {
  const scheduled = items.filter((i) => i.startTime);
  const unscheduled = items.filter((i) => !i.startTime);
  const groups = new Map();
  for (const item of scheduled) {
    const key = dayKey(item.startTime);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const sortedKeys = [...groups.keys()].sort();

  if (items.length === 0) {
    return <p className="text-stone-500 text-sm">No itinerary items yet.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {sortedKeys.map((key) => (
        <div key={key}>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">{dayLabel(key)}</h2>
          <div className="flex flex-col gap-3">
            {groups.get(key).map((item) => (
              <ItemCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} onResolvePhoto={onResolvePhoto} />
            ))}
          </div>
        </div>
      ))}

      {unscheduled.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Unscheduled</h2>
          <div className="flex flex-col gap-3">
            {unscheduled.map((item) => (
              <ItemCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} onResolvePhoto={onResolvePhoto} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
