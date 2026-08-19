import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TripCoverBanner from "@/components/TripCoverBanner";
import ItineraryTimeline from "@/components/ItineraryTimeline";

// A shared trip's contents can change after the link is handed out, so
// always render fresh rather than a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function SharedTripPage({ params }) {
  const { token } = await params;
  const trip = await prisma.trip.findUnique({
    where: { shareToken: token },
    include: { items: { orderBy: { startTime: "asc" } } },
  });
  // A missing OR no-longer-shared trip (shareToken cleared) both 404 the
  // same way — the lookup is by shareToken, so a revoked link simply stops
  // matching anything.
  if (!trip) notFound();

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <TripCoverBanner trip={trip} />
      {/* No onEdit/onDelete/onResolvePhoto — ItemCard renders read-only. */}
      <ItineraryTimeline items={trip.items} />
    </div>
  );
}
