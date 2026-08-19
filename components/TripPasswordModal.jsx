"use client";

import { useState, useEffect } from "react";

// Sets/changes/removes this trip's own view-only password — separate from
// the master password (set in Settings, grants full access to every trip)
// and separate from the Share button, which no longer needs a password at
// all. Only reachable with full access already, so the current value is
// shown directly (not just a "set" indicator) for handing out.
export default function TripPasswordModal({ tripId, sharePassword, onClose, onChange }) {
  const [passwordInput, setPasswordInput] = useState(sharePassword || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    setPasswordInput(sharePassword || "");
  }, [sharePassword]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sharePassword: passwordInput }),
      });
      const data = await res.json();
      onChange(data.sharePassword);
      setMessage(data.sharePassword ? "Password saved." : "Password removed — this trip can no longer be opened with a view-only password.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sharePassword: "" }),
      });
      const data = await res.json();
      onChange(data.sharePassword);
      setPasswordInput("");
      setMessage("Password removed — this trip can no longer be opened with a view-only password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-5 w-full max-w-md flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Trip password (view-only)</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">✕</button>
        </div>

        <p className="text-sm text-stone-500">
          Anyone who enters this password on this trip&apos;s login screen gets read-only access — they
          can&apos;t add, edit, delete, import, or share. The master password (set in Settings) always
          grants full access instead.
        </p>

        <form onSubmit={save} className="flex gap-2">
          <input
            type="text"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="No view-only password set"
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-600 text-white px-3 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
        {sharePassword && (
          <button
            onClick={remove}
            disabled={saving}
            className="text-sm text-stone-500 hover:text-stone-700 self-start underline disabled:opacity-50"
          >
            Remove password
          </button>
        )}
        {message && <p className="text-sm text-teal-700">{message}</p>}
      </div>
    </div>
  );
}
