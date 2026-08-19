import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TripCoverBanner from "@/components/TripCoverBanner";
import ItineraryTimeline from "@/components/ItineraryTimeline";

// A shared trip's contents can change after the link is handed out, so
// always render fresh rather than a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function SharedTripPage({ params }) {
  const { slug } = await params;
  const trip = await prisma.trip.findUnique({
    where: { slug },
    include: { items: { orderBy: { startTime: "asc" } } },
  });
  // A missing trip, OR one that isn't currently shared (shareToken cleared
  // by "Stop sharing"), both 404 the same way.
  if (!trip || !trip.shareToken) notFound();

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <TripCoverBanner trip={trip} />
      {/* No onEdit/onDelete/onResolvePhoto — ItemCard renders read-only. */}
      <ItineraryTimeline items={trip.items} />
    </div>
  );
}
