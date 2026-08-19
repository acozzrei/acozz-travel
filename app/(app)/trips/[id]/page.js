import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TripView from "@/components/TripView";

// Trip contents change constantly (add/edit/import), so always render fresh.
export const dynamic = "force-dynamic";

export default async function TripPage({ params }) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { items: { orderBy: { startTime: "asc" } } },
  });
  if (!trip) notFound();

  return <TripView initialTrip={trip} />;
}
