"use client";

import { useState } from "react";
import { formatRange } from "@/lib/dates";

export default function TripCoverBanner({ trip, editable, onRename }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(trip.name);
  const range = formatRange(trip.startDate, trip.endDate);

  async function saveRename() {
    const next = name.trim();
    if (next && next !== trip.name) await onRename(next);
    setRenaming(false);
  }

  return (
    <div className="card overflow-hidden mb-6">
      <div className="h-48 bg-gradient-to-br from-teal-500 to-teal-700 relative">
        {trip.coverPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-0 left-0 p-5 text-white">
          {editable && renaming ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") {
                  setName(trip.name);
                  setRenaming(false);
                }
              }}
              className="text-2xl font-semibold bg-black/40 rounded px-2 py-1 text-white outline-none w-full"
            />
          ) : (
            <h1
              className={`text-2xl font-semibold ${editable ? "cursor-pointer hover:underline decoration-dotted underline-offset-4" : ""}`}
              title={editable ? "Click to rename trip" : undefined}
              onClick={() => {
                if (editable) {
                  setName(trip.name);
                  setRenaming(true);
                }
              }}
            >
              {trip.name}
            </h1>
          )}
          <p className="text-sm text-white/90">
            {trip.destination}
            {range ? ` · ${range}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
