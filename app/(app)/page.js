import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewTripForm from "@/components/NewTripForm";
import GenerateItineraryForm from "@/components/GenerateItineraryForm";
import SeedDemoButton from "@/components/SeedDemoButton";
import TripList from "@/components/TripList";
import { getSettings } from "@/lib/settings";
import { getRequestAppAccess } from "@/lib/appAuth";

// This list changes whenever a trip is added/edited, so always render fresh
// rather than serving a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();
  const role = await getRequestAppAccess(settings);
  if (!role) redirect("/login");

  const trips = await prisma.trip.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trips</h1>
        </div>
        {role === "edit" && (
          <div className="flex items-center gap-3">
            <GenerateItineraryForm />
            <NewTripForm
              triggerLabel="or create a blank trip"
              triggerClassName="text-xs text-stone-400 hover:text-stone-600 underline"
            />
          </div>
        )}
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

      <TripList initialTrips={trips} canReorder={role === "edit"} />
    </div>
  );
}
