"use client";

import { useState, useEffect } from "react";

export default function ShareModal({ tripId, shareToken, sharePassword, onClose, onChange, onPasswordChange }) {
  const [token, setToken] = useState(shareToken);
  const [loading, setLoading] = useState(!shareToken);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

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

  async function savePassword(e) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sharePassword: passwordInput }),
      });
      const data = await res.json();
      onPasswordChange(data.sharePassword);
      setPasswordInput("");
      setPasswordMessage(data.sharePassword ? "Password set." : "Password removed — link is open to anyone who has it.");
    } finally {
      setPasswordSaving(false);
    }
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

            <div className="border-t border-stone-200 pt-3 mt-1 flex flex-col gap-2">
              <p className="text-sm text-stone-500">
                {sharePassword
                  ? "A password is required to view this link."
                  : "Optionally require a password before this link opens."}
              </p>
              <form onSubmit={savePassword} className="flex gap-2">
                <input
                  type="text"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={sharePassword ? "Set a new password" : "No password set"}
                  className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {passwordSaving ? "Saving…" : "Save"}
                </button>
              </form>
              {sharePassword && (
                <button
                  onClick={() => {
                    setPasswordInput("");
                    fetch(`/api/trips/${tripId}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ sharePassword: "" }),
                    })
                      .then((r) => r.json())
                      .then((data) => {
                        onPasswordChange(data.sharePassword);
                        setPasswordMessage("Password removed — link is open to anyone who has it.");
                      });
                  }}
                  className="text-sm text-stone-500 hover:text-stone-700 self-start underline"
                >
                  Remove password
                </button>
              )}
              {passwordMessage && <p className="text-sm text-teal-700">{passwordMessage}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
