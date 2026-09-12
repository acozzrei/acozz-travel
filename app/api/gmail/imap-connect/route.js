import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/settings";
import { getRequestSettingsAccess } from "@/lib/settingsAuth";
import { testImapLogin } from "@/lib/gmailImap";
import { ensureDataKey, encryptSecret } from "@/lib/imapSecrets";

// POST /api/gmail/imap-connect { email, password }
// Verifies the Gmail address + app password with a real IMAP login, then
// stores them (password encrypted; the app manages its own data-encryption
// key, so no extra env vars are needed). This is the simple alternative to
// the OAuth client ID/secret flow.
export async function POST(request) {
  if (!(await getRequestSettingsAccess())) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }

  const { email, password } = await request.json().catch(() => ({}));
  const cleanEmail = String(email || "").trim();
  // App passwords are displayed with spaces ("abcd efgh ijkl mnop") — strip them.
  const cleanPassword = String(password || "").replace(/\s+/g, "");
  if (!cleanEmail || !cleanPassword) {
    return NextResponse.json(
      { error: "Enter your Gmail address and app password." },
      { status: 400 }
    );
  }

  try {
    await testImapLogin(cleanEmail, cleanPassword);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  let enc;
  try {
    const settings = await getSettings();
    enc = encryptSecret(cleanPassword, await ensureDataKey(settings));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  await updateSettings({
    gmailImapEmail: cleanEmail,
    gmailImapPasswordEnc: enc,
    gmailConnectedEmail: cleanEmail,
  });
  return NextResponse.json({ ok: true, email: cleanEmail });
}
