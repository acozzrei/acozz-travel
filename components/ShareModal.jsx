"use client";

import { useState, useEffect } from "react";

export default function ShareModal({ tripId, shareToken, onClose, onChange }) {
  const [token, setToken] = useState(shareToken);
  const [loading, setLoading] = useState(!shareToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const url = token && typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : "";

  async function enableSharing() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/share`, { method: "POST" });
      if (!res.ok) throw new Error("Couldn't create a share link");
      const data = await res.json();
      setToken(data.shareToken);
      onChange(data.shareToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function stopSharing() {
    if (!confirm("Stop sharing? The current link will stop working immediately.")) return;
    await fetch(`/api/trips/${tripId}/share`, { method: "DELETE" });
    setToken(null);
    onChange(null);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Fire the initial share creation as soon as the modal mounts without a
  // token yet, so opening "Share" on an unshared trip generates the link
  // right away instead of requiring a second click.
  useEffect(() => {
    if (!shareToken) enableSharing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-5 w-full max-w-md flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Share this trip</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">✕</button>
        </div>

        <p className="text-sm text-stone-500">
          Anyone with this link can view the itinerary — no account needed. They can&apos;t edit it or see
          any of your other trips.
        </p>

        {loading && <p className="text-sm text-stone-500">Generating link…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {token && !loading && (
          <>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-600"
              />
              <button
                onClick={copyLink}
                className="rounded-lg bg-teal-600 text-white px-3 py-2 text-sm font-medium hover:bg-teal-700 transition whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
            <button
              onClick={stopSharing}
              className="text-sm text-red-600 hover:text-red-700 self-start mt-1"
            >
              Stop sharing
            </button>
          </>
        )}
      </div>
    </div>
  );
}
