import { redirect, notFound } from "next/navigation";
import TripView from "@/components/TripView";
import { findTripByIdOrSlug } from "@/lib/slug";

// Trip contents change constantly (add/edit/import), so always render fresh.
export const dynamic = "force-dynamic";

// This is the owner's editing page — the "backend." It's kept separate from
// the public /share/[slug] page (see that route), which is read-only and
// never exposes add/edit/import controls. Only someone who has this app's
// URL directly (not a share link) ever lands here.
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

  return <TripView initialTrip={trip} />;
}
