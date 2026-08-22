"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AddItemForm from "@/components/AddItemForm";
import GmailImportPanel from "@/components/GmailImportPanel";
import ShareModal from "@/components/ShareModal";
import TripPasswordModal from "@/components/TripPasswordModal";
import TripCoverBanner from "@/components/TripCoverBanner";
import ItineraryTimeline from "@/components/ItineraryTimeline";

export default function TripView({ initialTrip, accessLevel }) {
  const router = useRouter();
  const [trip, setTrip] = useState(initialTrip);
  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [gmailOpen, setGmailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);

  // "full" (master password) can do everything; "view" (this trip's own
  // password) is read-only — every mutating control below is hidden for it.
  const canEdit = accessLevel === "full";

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/trips/${initialTrip.id}`);
    if (res.ok) setTrip(await res.json());
  }, [initialTrip.id]);

  // The only way to switch between full and view-only on this trip is to
  // clear the current session and log back in with the other password.
  async function logout() {
    setLoggingOut(true);
    try {
      await fetch(`/api/trips/${trip.id}/logout`, { method: "POST" });
      router.push(`/trips/${trip.slug}/login`);
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Remove "${item.title}" from this trip?`)) return;
    await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    refresh();
  }

  async function handleDeleteTrip() {
    if (!confirm(`Delete "${trip.name}" and everything in it? This can't be undone.`)) return;
    setDeletingTrip(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete trip");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setDeletingTrip(false);
    }
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

      {!canEdit && (
        <div className="flex flex-wrap items-center gap-3 bg-stone-100 rounded-lg px-3 py-2 mb-4">
          <button
            onClick={logout}
            disabled={loggingOut}
            className="text-sm text-teal-700 hover:text-teal-800 underline disabled:opacity-50 ml-auto"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}

      {canEdit && (
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
          <button
            onClick={logout}
            disabled={loggingOut}
            className="text-sm text-stone-500 hover:text-stone-700 underline disabled:opacity-50 self-center"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
          <button
            onClick={handleDeleteTrip}
            disabled={deletingTrip}
            className="text-sm text-red-600 hover:text-red-700 underline disabled:opacity-50 self-center"
          >
            {deletingTrip ? "Deleting…" : "Delete trip"}
          </button>
        </div>
      )}

      <ItineraryTimeline
        items={trip.items}
        onEdit={canEdit ? setEditingItem : undefined}
        onDelete={canEdit ? handleDelete : undefined}
        onResolvePhoto={canEdit ? handleResolvePhoto : undefined}
      />

      {canEdit && addOpen && (
        <AddItemForm
          tripId={trip.id}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            refresh();
          }}
        />
      )}
      {canEdit && editingItem && (
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
      {canEdit && gmailOpen && (
        <GmailImportPanel
          tripId={trip.id}
          onClose={() => setGmailOpen(false)}
          onImported={refresh}
        />
      )}
      {canEdit && shareOpen && (
        <ShareModal
          tripId={trip.id}
          tripName={trip.name}
          tripSlug={trip.slug}
          shareToken={trip.shareToken}
          onClose={() => setShareOpen(false)}
          onChange={(shareToken) => setTrip((t) => ({ ...t, shareToken }))}
        />
      )}
      {canEdit && passwordOpen && (
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
