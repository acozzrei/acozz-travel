import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import TripView from "@/components/TripView";
import { shareCookieName, isValidShareSession } from "@/lib/shareAuth";
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

  // A trip's own password (set via its "Trip password" control, separate
  // from sharing) protects the owner's view of it — unaffected by whether
  // it's currently shared or what the share link needs.
  if (trip.sharePassword) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(shareCookieName(trip.id))?.value;
    const authed = await isValidShareSession(trip.id, trip.sharePassword, cookieValue);
    if (!authed) redirect(`/trips/${trip.slug}/login`);
  }

  // Never ship the raw password down to the client — TripView only needs to
  // know whether one is set.
  const { sharePassword, ...safeTrip } = trip;
  return <TripView initialTrip={{ ...safeTrip, sharePassword: Boolean(sharePassword) }} />;
}
