import { redirect } from "next/navigation";
import { getRequestSettingsAccess } from "@/lib/settingsAuth";
import SettingsForm from "@/components/SettingsForm";

// Reads a live cookie against the current master password, so it can't be
// served from a cached/static render.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const authed = await getRequestSettingsAccess();
  if (!authed) redirect("/settings/login");
  return <SettingsForm />;
}
