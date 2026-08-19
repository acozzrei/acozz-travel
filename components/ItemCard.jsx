"use client";

const TYPE_LABELS = {
  activity: "Activity",
  event: "Event",
  dinner: "Dinner",
  lodging: "Lodging",
  transport: "Transport",
  other: "Other",
};

const TYPE_COLORS = {
  activity: "bg-amber-100 text-amber-800",
  event: "bg-violet-100 text-violet-800",
  dinner: "bg-rose-100 text-rose-800",
  lodging: "bg-sky-100 text-sky-800",
  transport: "bg-emerald-100 text-emerald-800",
  other: "bg-stone-100 text-stone-700",
};

// Itinerary times are stored as the destination's own wall-clock time
// (e.g. "6:30pm in Grand Cayman"), using UTC only as the storage
// convention — not the actual UTC instant. So they must always be
// displayed in UTC too, regardless of the viewer's own timezone, or a
// visitor in New York would see Cayman's 6:30pm dinner shifted to 5:30pm.
function formatTime(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
}

function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// onEdit/onDelete/onResolvePhoto are optional so this same card can render
// read-only on a shared trip link (no owner controls) or fully interactive
// on the owner's own trip page.
export default function ItemCard({ item, onEdit, onDelete, onResolvePhoto }) {
  const canceled = item.status === "canceled";
  const editable = Boolean(onEdit || onDelete);

  return (
    <div className={`card overflow-hidden flex flex-col sm:flex-row ${canceled ? "opacity-60" : ""}`}>
      <div className="sm:w-56 h-40 sm:h-auto bg-stone-100 relative flex-shrink-0">
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photoUrl} alt={item.venueName || item.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-center text-xs text-stone-400 p-3">
            {editable ? (
              item.type === "transport" ? (
                <>
                  No photo yet — a venue lookup won&apos;t show the vehicle itself.
                  <button onClick={() => onEdit(item)} className="ml-1 underline hover:text-teal-700">
                    Add a photo
                  </button>
                </>
              ) : (
                <>
                  No photo yet.
                  {onResolvePhoto && (
                    <button onClick={() => onResolvePhoto(item)} className="ml-1 underline hover:text-teal-700">
                      Try to find one
                    </button>
                  )}
                </>
              )
            ) : (
              "No photo yet."
            )}
          </div>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[item.type] || TYPE_COLORS.other}`}>
              {TYPE_LABELS[item.type] || "Other"}
            </span>
            <h4 className="font-semibold mt-1">
              {item.title}
              {canceled && <span className="ml-2 text-xs font-normal text-red-600">(canceled)</span>}
            </h4>
          </div>
          {editable && (
            <div className="flex gap-2 text-xs text-stone-400 whitespace-nowrap">
              {onEdit && <button onClick={() => onEdit(item)} className="hover:text-stone-700">Edit</button>}
              {onDelete && <button onClick={() => onDelete(item)} className="hover:text-red-600">Delete</button>}
            </div>
          )}
        </div>
        <p className="text-sm text-stone-500">
          {formatTime(item.startTime)}
          {item.endTime ? ` – ${formatTime(item.endTime)}` : ""}
          {item.partySize ? ` · Party of ${item.partySize}` : ""}
        </p>
        {item.address && (
          <p className="text-sm text-stone-500">
            {item.address}{" "}
            <a
              href={mapsUrl(item.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 underline hover:text-teal-800"
            >
              Open in Google Maps
            </a>
          </p>
        )}
        {item.notes && <p className="text-sm text-stone-600 whitespace-pre-line">{item.notes}</p>}
        <div className="flex items-center gap-3 text-xs text-stone-400 mt-auto pt-1">
          {item.confirmationNo && <span>Confirmation #{item.confirmationNo}</span>}
          {item.sourceSender && <span>via {item.sourceSender}</span>}
        </div>
      </div>
    </div>
  );
}
