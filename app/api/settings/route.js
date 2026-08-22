import { NextResponse } from "next/server";
import { getSettings, updateSettings, publicSettings } from "@/lib/settings";
import { getRequestSettingsAccess } from "@/lib/settingsAuth";

export async function GET() {
  if (!(await getRequestSettingsAccess())) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json(publicSettings(settings));
}

// masterPassword and viewPassword are deliberately NOT editable here — they
// can only be changed through /api/settings/change-password, which requires
// re-entering the current master password as a confirmation step.
const EDITABLE = ["googleMapsApiKey", "gmailClientId", "gmailClientSecret", "anthropicApiKey"];

export async function POST(request) {
  if (!(await getRequestSettingsAccess())) {
    return NextResponse.json({ error: "Password required" }, { status: 401 });
  }
  const body = await request.json();
  const data = {};
  for (const key of EDITABLE) {
    // Empty string clears the key; undefined leaves it untouched.
    if (body[key] !== undefined) data[key] = body[key] === "" ? null : body[key];
  }
  const updated = await updateSettings(data);
  return NextResponse.json(publicSettings(updated));
}
