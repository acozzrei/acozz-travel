"use client";

import { useState } from "react";

// Sets/changes/removes the password that gates this trip's OWN page
// (/trips/[slug]) — separate from the Share button, which no longer needs a
// password at all. Kept as its own small modal so the two concerns (sharing
// vs. protecting the owner's page) don't get tangled together in the UI.
export default function TripPasswordModal({ tripId, sharePassword, onClose, onChange }) {
  const [passwordInput, setPasswordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

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
      setPasswordInput("");
      setMessage(data.sharePassword ? "Password set." : "Password removed — this trip's page is now open to anyone with the link.");
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
      setMessage("Password removed — this trip's page is now open to anyone with the link.");
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
          <h3 className="font-semibold text-lg">Trip password</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">✕</button>
        </div>

        <p className="text-sm text-stone-500">
          {sharePassword
            ? "A password is required to open this trip's own page (not the share link)."
            : "Optionally require a password before this trip's own page opens. This is separate from the share link, which is always open."}
        </p>

        <form onSubmit={save} className="flex gap-2">
          <input
            type="text"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder={sharePassword ? "Set a new password" : "No password set"}
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving || !passwordInput}
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
