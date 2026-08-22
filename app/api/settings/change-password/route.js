import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/settings";
import { getRequestSettingsAccess, SETTINGS_COOKIE, sessionTokenFor } from "@/lib/settingsAuth";

// Deliberately separate from the general POST /api/settings: changing
// either password here requires re-entering the CURRENT master password as
// an explicit confirmation, even though the caller is already logged into
// Settings (an open browser tab left logged in shouldn't be enough on its
// own to silently hand out full access to someone else). The general
// Settings route no longer accepts masterPassword/viewPassword at all, so
// this is the only path that can change them.
export async function POST(request) {
  if (!(await getRequestSettingsAccess())) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }

  const { currentMasterPassword, target, newPassword } = await request.json().catch(() => ({}));
  if (target !== "master" && target !== "view") {
    return NextResponse.json({ error: "Invalid target." }, { status: 400 });
  }
  const trimmed = (newPassword || "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Enter a new password." }, { status: 400 });
  }

  const settings = await getSettings();
  // Before any master password has ever been set there's nothing to confirm
  // against yet, so the very first one can still be set without this check.
  if (settings.masterPassword && currentMasterPassword !== settings.masterPassword) {
    return NextResponse.json({ error: "Current master password is incorrect." }, { status: 401 });
  }

  const field = target === "master" ? "masterPassword" : "viewPassword";
  await updateSettings({ [field]: trimmed });

  const res = NextResponse.json({ ok: true });
  if (target === "master") {
    // The session cookie is a hash of the master password, so changing it
    // would otherwise log this very request's session out immediately —
    // reissue it against the new value so the person making the change
    // stays logged in.
    res.cookies.set(SETTINGS_COOKIE, await sessionTokenFor(trimmed), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
