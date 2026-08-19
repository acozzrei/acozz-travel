"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SeedDemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function seed() {
    setLoading(true);
    try {
      const res = await fetch("/api/seed-demo", { method: "POST" });
      const data = await res.json();
      router.push(`/trips/${data.trip.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={seed}
      disabled={loading}
      className="rounded-full border border-teal-600 text-teal-700 px-4 py-2 text-sm font-medium hover:bg-teal-50 transition disabled:opacity-50"
    >
      {loading ? "Adding…" : "Add my Grand Cayman trip"}
    </button>
  );
}
