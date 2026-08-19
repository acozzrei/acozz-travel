import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TripCoverBanner from "@/components/TripCoverBanner";
import ItineraryTimeline from "@/components/ItineraryTimeline";

// A shared trip's contents can change after the link is handed out, so
// always render fresh rather than a build-time snapshot.
export const dynamic = "force-dynamic";

// This is the public-facing page — read-only, no login, no add/edit/import
// controls of any kind. It's the only route ever handed out as a share
// link; the owner's editing "backend" lives separately at /trips/[slug].
export default async function SharedTripPage({ params }) {
  const { slug } = await params;
  const trip = await prisma.trip.findUnique({
    where: { slug },
    include: { items: { orderBy: { startTime: "asc" } } },
  });
  // A missing trip, or one that isn't currently shared, both 404 the same way.
  if (!trip || !trip.shareToken) notFound();

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <TripCoverBanner trip={trip} />
      {/* No onEdit/onDelete/onResolvePhoto — ItemCard renders read-only. */}
      <ItineraryTimeline items={trip.items} />
    </div>
  );
}
