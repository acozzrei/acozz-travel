"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SettingsLoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto px-5 py-16" />}>
      <SettingsLoginInner />
    </Suspense>
  );
}

function SettingsLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Incorrect password.");
        return;
      }
      router.push(searchParams.get("next") || "/settings");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-16 flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings login</h1>
        <p className="text-stone-500 text-sm mt-1">
          This page holds API keys and Gmail credentials, so it&apos;s password-protected.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
        >
          {loading ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
