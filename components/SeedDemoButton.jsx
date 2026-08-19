"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SeedDemoButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function seed(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seed-demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ masterPassword }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add trip");
      const data = await res.json();
      router.push(`/trips/${data.trip.slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-teal-600 text-teal-700 px-4 py-2 text-sm font-medium hover:bg-teal-50 transition"
      >
        Add my Grand Cayman trip
      </button>
    );
  }

  return (
    <form onSubmit={seed} className="flex flex-col gap-2 items-center">
      <div className="flex gap-2">
        <input
          required
          autoFocus
          type="password"
          placeholder="Master password"
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full border border-teal-600 text-teal-700 px-4 py-2 text-sm font-medium hover:bg-teal-50 transition disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? "Adding…" : "Add trip"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
