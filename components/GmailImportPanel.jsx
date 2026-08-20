"use client";

import { useEffect, useState } from "react";

function formatWhen(dt) {
  if (!dt) return "No date found";
  return new Date(dt).toLocaleString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function GmailImportPanel({ tripId, onClose, onImported }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount loading flag, no simpler alternative
    setLoading(true);
    fetch("/api/gmail/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tripId }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Couldn't scan Gmail");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setMode(data.mode);
        setCandidates(data.candidates);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [tripId]);

  async function importCandidate(candidate) {
    setBusyId(candidate.gmailMsgId);
    try {
      const res = await fetch("/api/gmail/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tripId, candidate }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Import failed");
      setCandidates((cs) => cs.filter((c) => c.gmailMsgId !== candidate.gmailMsgId));
      onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(candidate) {
    setBusyId(candidate.gmailMsgId);
    try {
      await fetch("/api/gmail/dismiss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gmailMsgId: candidate.gmailMsgId, tripId }),
      });
      setCandidates((cs) => cs.filter((c) => c.gmailMsgId !== candidate.gmailMsgId));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-5 w-full max-w-2xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Import from Gmail</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">✕</button>
        </div>

        {mode === "demo" && (
          <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">
            Showing the real bookings this trip was already built from — the app isn&apos;t connected to
            a live Gmail account yet, so it can&apos;t scan for anything new. Add Gmail OAuth credentials
            and connect an account in <a href="/settings" className="underline">Settings</a> to scan your
            real inbox for future bookings.
          </div>
        )}
        {mode === "live" && (
          <div className="text-xs bg-teal-50 text-teal-800 border border-teal-200 rounded-lg px-3 py-2">
            Scanned your connected Gmail inbox for booking confirmations.
          </div>
        )}

        {loading && <p className="text-sm text-stone-500">Scanning for bookings…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && candidates.length === 0 && (
          <p className="text-sm text-stone-500">No new booking emails found.</p>
        )}

        <div className="flex flex-col gap-2">
          {candidates.map((c) => (
            <div key={c.gmailMsgId} className="border border-stone-200 rounded-xl p-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{c.title || c.venueName}</p>
                <p className="text-xs text-stone-500">{formatWhen(c.startTime)}</p>
                {c.address && <p className="text-xs text-stone-500">{c.address}</p>}
                <p className="text-[11px] text-stone-400 mt-1">from {c.sender}{c.source ? ` · ${c.source}` : ""}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => dismiss(c)}
                  disabled={busyId === c.gmailMsgId}
                  className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => importCandidate(c)}
                  disabled={busyId === c.gmailMsgId}
                  className="text-xs rounded-full bg-teal-600 text-white px-3 py-1.5 hover:bg-teal-700 disabled:opacity-50"
                >
                  {busyId === c.gmailMsgId ? "…" : "Add to trip"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
