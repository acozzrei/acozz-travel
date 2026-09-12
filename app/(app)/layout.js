import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getRequestAppAccess } from "@/lib/appAuth";

// The owner's own view — trip list, trip editing, settings. Anyone who
// only has a /share/[token] link never sees this nav, so they can't browse
// into other trips or Settings from a link meant for one trip.
export default async function AppLayout({ children }) {
  const settings = await getSettings();
  const role = await getRequestAppAccess(settings);

  return (
    <>
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-white text-sm">✈</span>
            A.Cozz Travel
          </Link>
          <nav className="flex items-center gap-4 text-sm text-stone-600">
            <Link href="/" className="hover:text-stone-900">Trips</Link>
            {role === "edit" ? (
              <Link href="/settings" className="hover:text-stone-900">Settings</Link>
            ) : role === "view" ? (
              <Link
                href="/login"
                title="You're logged in with the view-only password — log in with the master password for full access."
                className="text-xs text-stone-400 border border-stone-200 rounded-full px-2 py-0.5 hover:text-stone-600 hover:border-stone-300"
              >
                View only
              </Link>
            ) : null}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
