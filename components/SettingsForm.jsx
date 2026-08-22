"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Field({ label, hint, value, onChange, placeholder, type = "text", set }) {
  return (
    <label className="text-sm font-medium text-stone-700 flex flex-col gap-1">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-stone-300 rounded-lg px-3 py-2 text-sm font-normal"
      />
      {hint && <span className="text-xs text-stone-400 font-normal">{hint}</span>}
      {set && <span className="text-xs text-teal-700 font-normal">Currently set (leave blank to keep it)</span>}
    </label>
  );
}

export default function SettingsForm() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-5 py-10 text-stone-500">Loading…</div>}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    googleMapsApiKey: "",
    gmailClientId: "",
    gmailClientSecret: "",
    anthropicApiKey: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [pwForm, setPwForm] = useState({ currentMasterPassword: "", masterNew: "", viewNew: "" });
  const [pwSavingTarget, setPwSavingTarget] = useState(null);
  const [pwMessage, setPwMessage] = useState(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => {
        if (r.status === 401) {
          router.replace("/settings/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setSettings(data);
      });
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflects the redirect query string into a one-time banner
    if (searchParams.get("gmailConnected")) setMessage({ type: "ok", text: "Gmail connected." });
    if (searchParams.get("gmailError")) setMessage({ type: "error", text: `Gmail connection failed: ${searchParams.get("gmailError")}` });
  }, [searchParams]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.status === 401) {
        router.replace("/settings/login");
        return;
      }
      const data = await res.json();
      setSettings(data);
      setForm({
        googleMapsApiKey: "",
        gmailClientId: "",
        gmailClientSecret: "",
        anthropicApiKey: "",
      });
      setMessage({ type: "ok", text: "Saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/settings/logout", { method: "POST" });
    router.push("/settings/login");
  }

  async function connectGmail() {
    const res = await fetch("/api/gmail/auth-url");
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setMessage({ type: "error", text: data.error });
  }

  async function changePassword(target) {
    const newPassword = target === "master" ? pwForm.masterNew : pwForm.viewNew;
    if (!newPassword.trim()) return;
    setPwSavingTarget(target);
    setPwMessage(null);
    try {
      const res = await fetch("/api/settings/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentMasterPassword: pwForm.currentMasterPassword, target, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwMessage({ type: "error", text: data.error || "Couldn't change the password." });
        return;
      }
      // Never echo the new password back — just clear the fields and refetch
      // the redacted settings so the rest of the page reflects the change.
      setPwForm({ currentMasterPassword: "", masterNew: "", viewNew: "" });
      setPwMessage({ type: "ok", text: target === "master" ? "Master password updated." : "View password updated." });
      const fresh = await fetch("/api/settings");
      if (fresh.ok) setSettings(await fresh.json());
    } catch {
      setPwMessage({ type: "error", text: "Couldn't change the password." });
    } finally {
      setPwSavingTarget(null);
    }
  }

  if (!settings) return <div className="max-w-2xl mx-auto px-5 py-10 text-stone-500">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-stone-500 text-sm mt-1">
            Add your own API keys so the app can pull real bookings and real location photos.
          </p>
        </div>
        {settings.authEnabled && (
          <button
            onClick={logout}
            className="text-sm text-stone-500 hover:text-stone-700 underline shrink-0"
          >
            Log out
          </button>
        )}
      </div>

      {message && (
        <p className={`text-sm rounded-lg px-3 py-2 ${message.type === "ok" ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      <section className="card p-5 flex flex-col gap-3">
        <h2 className="font-semibold">Trip access</h2>
        <p className="text-sm text-stone-500">
          Every trip now requires a password to open. The master password unlocks{" "}
          <strong>every</strong> trip with full access (Add/Edit/Delete/Import/Share), the home page&apos;s
          trip list, and this Settings page. The app-wide view password grants read-only access to the
          home page&apos;s trip list. Each trip also has its own separate password (set from that trip&apos;s
          own page) that only grants view-only access to that one trip.
        </p>
        <div className="text-sm text-stone-700 flex items-center gap-2">
          <span className="font-medium">Master password:</span>
          <span className={settings.masterPasswordSet ? "text-teal-700" : "text-stone-400"}>
            {settings.masterPasswordSet ? "Set" : "Not set — no one has full access yet"}
          </span>
        </div>
        <div className="text-sm text-stone-700 flex items-center gap-2">
          <span className="font-medium">App-wide view password:</span>
          <span className={settings.viewPasswordSet ? "text-teal-700" : "text-stone-400"}>
            {settings.viewPasswordSet ? "Set" : "Not set"}
          </span>
        </div>
        <p className="text-xs text-stone-400">
          Set or change either one under &quot;Change password&quot; below — for security, neither is
          displayed here once set.
        </p>
      </section>

      <section className="card p-5 flex flex-col gap-3">
        <h2 className="font-semibold">Change password</h2>
        <p className="text-sm text-stone-500">
          Enter the current master password once to change either password below.
        </p>
        {pwMessage && (
          <p className={`text-sm rounded-lg px-3 py-2 ${pwMessage.type === "ok" ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700"}`}>
            {pwMessage.text}
          </p>
        )}
        <label className="text-sm font-medium text-stone-700 flex flex-col gap-1">
          Current master password
          <input
            type="password"
            value={pwForm.currentMasterPassword}
            onChange={(e) => setPwForm((f) => ({ ...f, currentMasterPassword: e.target.value }))}
            placeholder={settings.masterPasswordSet ? "Required to change either password" : "No master password set yet — leave blank"}
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm font-normal"
          />
        </label>
        <div className="flex items-end gap-2">
          <label className="text-sm font-medium text-stone-700 flex flex-col gap-1 flex-1">
            New master password
            <input
              type="password"
              value={pwForm.masterNew}
              onChange={(e) => setPwForm((f) => ({ ...f, masterNew: e.target.value }))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm font-normal"
            />
          </label>
          <button
            type="button"
            onClick={() => changePassword("master")}
            disabled={pwSavingTarget !== null || !pwForm.masterNew.trim()}
            className="rounded-full border border-teal-600 text-teal-700 px-4 py-2 text-sm font-medium hover:bg-teal-50 transition disabled:opacity-50"
          >
            {pwSavingTarget === "master" ? "Updating…" : "Update"}
          </button>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-sm font-medium text-stone-700 flex flex-col gap-1 flex-1">
            New view password
            <input
              type="password"
              value={pwForm.viewNew}
              onChange={(e) => setPwForm((f) => ({ ...f, viewNew: e.target.value }))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm font-normal"
            />
          </label>
          <button
            type="button"
            onClick={() => changePassword("view")}
            disabled={pwSavingTarget !== null || !pwForm.viewNew.trim()}
            className="rounded-full border border-teal-600 text-teal-700 px-4 py-2 text-sm font-medium hover:bg-teal-50 transition disabled:opacity-50"
          >
            {pwSavingTarget === "view" ? "Updating…" : "Update"}
          </button>
        </div>
      </section>

      <section className="card p-5 flex flex-col gap-3">
        <h2 className="font-semibold">Real location photos</h2>
        <p className="text-sm text-stone-500">
          Uses the Google Maps Platform: a real photo of the venue when Google has one, falling back to a
          Street View image of the exact address. Enable the <strong>Places API</strong> and{" "}
          <strong>Street View Static API</strong> for your key in the Google Cloud Console.
        </p>
        <Field
          label="Google Maps API key"
          value={form.googleMapsApiKey}
          onChange={(v) => setForm((f) => ({ ...f, googleMapsApiKey: v }))}
          placeholder="AIza…"
          set={settings.googleMapsApiKeySet}
        />
      </section>

      <section className="card p-5 flex flex-col gap-3">
        <h2 className="font-semibold">Gmail import</h2>
        <p className="text-sm text-stone-500">
          Create an OAuth 2.0 Client ID (type &quot;Web application&quot;) in the Google Cloud Console, add
          this app&apos;s <code>/api/gmail/callback</code> URL as an authorized redirect URI, and enable the{" "}
          <strong>Gmail API</strong>.
        </p>
        <Field
          label="Gmail OAuth Client ID"
          value={form.gmailClientId}
          onChange={(v) => setForm((f) => ({ ...f, gmailClientId: v }))}
          set={settings.gmailClientIdSet}
        />
        <Field
          label="Gmail OAuth Client Secret"
          value={form.gmailClientSecret}
          onChange={(v) => setForm((f) => ({ ...f, gmailClientSecret: v }))}
          set={settings.gmailClientSecretSet}
        />
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={connectGmail}
            className="rounded-full border border-teal-600 text-teal-700 px-4 py-2 text-sm font-medium hover:bg-teal-50 transition"
          >
            {settings.gmailConnected ? "Reconnect Gmail" : "Connect Gmail"}
          </button>
          {settings.gmailConnected && (
            <span className="text-sm text-stone-500">Connected: {settings.gmailConnectedEmail}</span>
          )}
        </div>
      </section>

      <section className="card p-5 flex flex-col gap-3">
        <h2 className="font-semibold">Smarter email parsing (optional)</h2>
        <p className="text-sm text-stone-500">
          Add a Claude API key to accurately extract booking details from emails that don&apos;t match a
          known template (personal confirmations, unusual formats). Without this, the app falls back to
          pattern-matching for well-known senders like OpenTable and Sixt, plus a best-effort generic parser.
        </p>
        <Field
          label="Anthropic (Claude) API key"
          value={form.anthropicApiKey}
          onChange={(v) => setForm((f) => ({ ...f, anthropicApiKey: v }))}
          placeholder="sk-ant-…"
          set={settings.anthropicApiKeySet}
        />
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-full bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 self-start"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
