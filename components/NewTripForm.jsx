"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTripForm({ onDone }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, destination, startDate, endDate }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create trip");
      const trip = await res.json();
      setOpen(false);
      setName("");
      setDestination("");
      setStartDate("");
      setEndDate("");
      router.push(`/trips/${trip.slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition"
      >
        + New trip
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-5 flex flex-col gap-3 w-full max-w-md">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">New trip</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700 text-sm">
          Cancel
        </button>
      </div>
      <input
        required
        placeholder="Trip name (e.g. Grand Cayman)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
      />
      <input
        placeholder="Destination"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm flex-1"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm flex-1"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create trip"}
      </button>
    </form>
  );
}
