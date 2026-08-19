"use client";

import { useState, useCallback } from "react";
import AddItemForm from "@/components/AddItemForm";
import GmailImportPanel from "@/components/GmailImportPanel";
import ShareModal from "@/components/ShareModal";
import TripPasswordModal from "@/components/TripPasswordModal";
import TripCoverBanner from "@/components/TripCoverBanner";
import ItineraryTimeline from "@/components/ItineraryTimeline";

export default function TripView({ initialTrip }) {
  const [trip, setTrip] = useState(initialTrip);
  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [gmailOpen, setGmailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/trips/${initialTrip.id}`);
    if (res.ok) setTrip(await res.json());
  }, [initialTrip.id]);

  async function handleDelete(item) {
    if (!confirm(`Remove "${item.title}" from this trip?`)) return;
    await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    refresh();
  }

  async function handleResolvePhoto(item) {
    const res = await fetch(`/api/items/${item.id}/photo`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Couldn't find a photo. Add a Google Maps API key in Settings first.");
      return;
    }
    refresh();
  }

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <TripCoverBanner trip={trip} />

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition"
        >
          + Add item
        </button>
        <button
          onClick={() => setGmailOpen(true)}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 transition"
        >
          Import from Gmail
        </button>
        <button
          onClick={() => setShareOpen(true)}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 transition ml-auto"
        >
          {trip.shareToken ? "Shared ✓" : "Share"}
        </button>
        <button
          onClick={() => setPasswordOpen(true)}
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 transition"
        >
          {trip.sharePassword ? "Trip password ✓" : "Trip password"}
        </button>
      </div>

      <ItineraryTimeline
        items={trip.items}
        onEdit={setEditingItem}
        onDelete={handleDelete}
        onResolvePhoto={handleResolvePhoto}
      />

      {addOpen && (
        <AddItemForm
          tripId={trip.id}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}
      {editingItem && (
        <AddItemForm
          tripId={trip.id}
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            refresh();
          }}
        />
      )}
      {gmailOpen && (
        <GmailImportPanel
          tripId={trip.id}
          onClose={() => setGmailOpen(false)}
          onImported={refresh}
        />
      )}
      {shareOpen && (
        <ShareModal
          tripId={trip.id}
          tripName={trip.name}
          tripSlug={trip.slug}
          shareToken={trip.shareToken}
          onClose={() => setShareOpen(false)}
          onChange={(shareToken) => setTrip((t) => ({ ...t, shareToken }))}
        />
      )}
      {passwordOpen && (
        <TripPasswordModal
          tripId={trip.id}
          sharePassword={trip.sharePassword}
          onClose={() => setPasswordOpen(false)}
          onChange={(sharePassword) => setTrip((t) => ({ ...t, sharePassword }))}
        />
      )}
    </div>
  );
}
