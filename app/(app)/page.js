import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewTripForm from "@/components/NewTripForm";
import SeedDemoButton from "@/components/SeedDemoButton";
import { formatRange } from "@/lib/dates";

// This list changes whenever a trip is added/edited, so always render fresh
// rather than serving a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const trips = await prisma.trip.findMany({
    orderBy: { startDate: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your trips</h1>
          <p className="text-stone-500 text-sm mt-1">
            Build itineraries, pull in real bookings from Gmail, see real photos of every place.
          </p>
        </div>
        <NewTripForm />
      </div>

      {trips.length === 0 && (
        <div className="card p-8 flex flex-col items-center text-center gap-4 mb-8">
          <p className="text-stone-600 max-w-md">
            No trips yet. Start a blank one, or add your upcoming Grand Cayman trip — it&apos;s
            already built from your real booking confirmation emails, with real photos.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <SeedDemoButton />
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {trips.map((trip) => (
          <Link
            key={trip.id}
            href={`/trips/${trip.slug}`}
            className="card overflow-hidden hover:shadow-md transition group"
          >
            <div className="h-36 bg-gradient-to-br from-teal-500 to-teal-700 relative">
              {trip.coverPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trip.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition" />
            </div>
            <div className="p-4">
              <h3 className="font-semibold">{trip.name}</h3>
              {trip.destination && <p className="text-sm text-stone-500">{trip.destination}</p>}
              <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
                <span>{formatRange(trip.startDate, trip.endDate) || "No dates yet"}</span>
                <span>{trip._count.items} item{trip._count.items === 1 ? "" : "s"}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
