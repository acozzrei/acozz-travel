"use client";

import { useState, useEffect } from "react";

const TYPES = ["activity", "event", "dinner", "lodging", "transport", "other"];

// Itinerary times are stored as the destination's own wall-clock value
// using UTC as the storage convention (not the browser's local time), so
// this reads back with UTC getters — otherwise editing a Cayman 6:30pm
// dinner from a browser in New York would silently shift it to 2:30pm.
function toLocalInputValue(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export default function AddItemForm({ tripId, item, onClose, onSaved }) {
  const editing = Boolean(item);
  const [form, setForm] = useState({
    type: item?.type || "activity",
    title: item?.title || "",
    venueName: item?.venueName || "",
    address: item?.address || "",
    startTime: toLocalInputValue(item?.startTime),
    endTime: toLocalInputValue(item?.endTime),
    partySize: item?.partySize || "",
    notes: item?.notes || "",
    confirmationNo: item?.confirmationNo || "",
    photoUrl: item?.photoUrl || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // The <input type="datetime-local"> value ("YYYY-MM-DDTHH:MM") is the
      // destination's wall-clock time. Append "Z" so it's parsed as that
      // exact value in UTC, rather than as the editing browser's local time.
      const payload = {
        ...form,
        partySize: form.partySize ? Number(form.partySize) : null,
        startTime: form.startTime ? new Date(`${form.startTime}:00Z`).toISOString() : null,
        endTime: form.endTime ? new Date(`${form.endTime}:00Z`).toISOString() : null,
      };
      // A manually-typed photo URL always wins and is tagged as such. If
      // the field is blank, omit photoUrl entirely: on create, that leaves
      // the automatic Places/Street View lookup to run; on edit, it leaves
      // whatever photo the item already has untouched instead of erasing it.
      if (form.photoUrl && form.photoUrl.trim()) {
        payload.photoUrl = form.photoUrl.trim();
        payload.photoSource = "manual";
      } else {
        delete payload.photoUrl;
      }
      const url = editing ? `/api/items/${item.id}` : `/api/trips/${tripId}/items`;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-5 w-full max-w-lg flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">{editing ? "Edit item" : "Add itinerary item"}</h3>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-700">✕</button>
        </div>

        <label className="text-sm font-medium text-stone-600">
          Type
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-stone-600">
          Title
          <input
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            placeholder="e.g. Dinner at NOVA"
          />
        </label>

        <label className="text-sm font-medium text-stone-600">
          Venue name
          <input
            value={form.venueName}
            onChange={(e) => set("venueName", e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Used to look up a real photo of the exact place"
          />
        </label>

        <label className="text-sm font-medium text-stone-600">
          Address
          <input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm font-medium text-stone-600">
          Photo URL
          <input
            value={form.photoUrl}
            onChange={(e) => set("photoUrl", e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Paste a photo link — e.g. a rental car's photo, where a venue address doesn't apply"
          />
        </label>

        <div className="flex gap-2">
          <label className="text-sm font-medium text-stone-600 flex-1">
            Start
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-stone-600 flex-1">
            End
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => set("endTime", e.target.value)}
              className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <label className="text-sm font-medium text-stone-600 flex-1">
            Party size
            <input
              type="number"
              min="1"
              value={form.partySize}
              onChange={(e) => set("partySize", e.target.value)}
              className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-stone-600 flex-1">
            Confirmation #
            <input
              value={form.confirmationNo}
              onChange={(e) => set("confirmationNo", e.target.value)}
              className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="text-sm font-medium text-stone-600">
          Notes
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 mt-1"
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Add to itinerary"}
        </button>
      </form>
    </div>
  );
}
