import { redirect, notFound } from "next/navigation";
import TripView from "@/components/TripView";
import { getRequestTripAccess } from "@/lib/shareAuth";
import { getSettings } from "@/lib/settings";
import { findTripByIdOrSlug } from "@/lib/slug";

// Trip contents change constantly (add/edit/import), so always render fresh.
export const dynamic = "force-dynamic";

export default async function TripPage({ params }) {
  const { slug } = await params;
  // Accepts either the slug (normal case) or an old raw id (e.g. a stale
  // bookmark from before this page used slugs), so existing links don't break.
  const trip = await findTripByIdOrSlug(slug, {
    include: { items: { orderBy: { startTime: "asc" } } },
  });
  if (!trip) notFound();

  // Someone reached this page via the old id — send them to the canonical
  // slug URL so future visits (and the address bar) use the clean form.
  if (trip.slug && slug !== trip.slug) redirect(`/trips/${trip.slug}`);

  // Every trip requires a password now, regardless of whether this
  // particular trip has its own view-only password set — the master
  // password (from Settings) always works, so there's always at least one
  // way in.
  const settings = await getSettings();
  const accessLevel = await getRequestTripAccess(trip, settings.masterPassword);
  if (!accessLevel) redirect(`/trips/${trip.slug}/login`);

  // Never ship the raw password(s) down to the client. Full-access sessions
  // get the trip's own password back (so the owner can read it to hand it
  // out); view-only sessions just get a boolean.
  const { sharePassword, ...safeTrip } = trip;
  const safeSharePassword = accessLevel === "full" ? sharePassword : Boolean(sharePassword);
  return <TripView initialTrip={{ ...safeTrip, sharePassword: safeSharePassword }} accessLevel={accessLevel} />;
}
