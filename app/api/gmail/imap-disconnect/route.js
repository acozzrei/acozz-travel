import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/settings";
import { getRequestSettingsAccess } from "@/lib/settingsAuth";

// POST /api/gmail/imap-disconnect — removes the stored Gmail IMAP login.
export async function POST() {
  if (!(await getRequestSettingsAccess())) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }

  const settings = await getSettings();
  const update = { gmailImapEmail: null, gmailImapPasswordEnc: null };
  // Only clear the displayed address if it came from the IMAP login.
  if (settings.gmailConnectedEmail && settings.gmailConnectedEmail === settings.gmailImapEmail) {
    update.gmailConnectedEmail = null;
  }
  await updateSettings(update);
  return NextResponse.json({ ok: true });
}
