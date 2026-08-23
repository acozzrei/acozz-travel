"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Primary "New trip" flow: search any destination worldwide, pick dates,
// and get a full day-by-day itinerary generated from real nearby
// restaurants/attractions (Google Places) assembled by Claude. See
// components/NewTripForm.jsx for the plain blank-trip fallback shown
// alongside this on the home page.
export default function GenerateItineraryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || selected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale suggestions when the query is emptied or a destination is chosen
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results || []);
        }
      } catch {
        // A failed autocomplete lookup just means no suggestions this
        // keystroke — not worth surfacing as an error.
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, selected]);

  function chooseSuggestion(s) {
    setSelected(s);
    setQuery(s.description);
    setSuggestions([]);
  }

  function reset() {
    setQuery("");
    setSelected(null);
    setStartDate("");
    setEndDate("");
    setMasterPassword("");
    setError(null);
  }

  async function generate(e) {
    e.preventDefault();
    if (!selected) {
      setError("Pick a destination from the suggestions list.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/trips/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          placeId: selected.placeId,
          destinationName: selected.description,
          startDate,
          endDate,
          masterPassword,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to generate itinerary");
      const trip = await res.json();
      setOpen(false);
      reset();
      router.push(`/trips/${trip.slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
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
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={() => !generating && setOpen(false)}
    >
      <form
        onSubmit={generate}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-5 w-full max-w-lg flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Plan a new trip</h3>
          {!generating && (
            <button type="button" onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700">
              ✕
            </button>
          )}
        </div>
        <p className="text-sm text-stone-500">
          Search any destination, pick your dates, and get a full day-by-day itinerary — real restaurants and
          attractions, ready to edit.
        </p>

        <label className="text-sm font-medium text-stone-600 relative">
          Destination
          <input
            required
            disabled={generating}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="e.g. Lisbon, Tuscany, Japan…"
            autoComplete="off"
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 bg-white border border-stone-200 rounded-lg shadow-md mt-1 max-h-48 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  type="button"
                  key={s.placeId}
                  onClick={() => chooseSuggestion(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50"
                >
                  {s.description}
                </button>
              ))}
            </div>
          )}
        </label>

        <div className="flex gap-2">
          <label className="text-sm font-medium text-stone-600 flex-1">
            Start date
            <input
              required
              disabled={generating}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
            />
          </label>
          <label className="text-sm font-medium text-stone-600 flex-1">
            End date
            <input
              required
              disabled={generating}
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
            />
          </label>
        </div>

        <label className="text-sm font-medium text-stone-600">
          Master password
          <input
            required
            disabled={generating}
            type="password"
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-lg px-3 py-2 text-sm disabled:bg-stone-50"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={generating}
          className="rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 mt-1 flex items-center justify-center gap-2"
        >
          {generating && (
            <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          {generating ? "Building your itinerary — this can take about a minute…" : "Generate itinerary"}
        </button>
      </form>
    </div>
  );
}
