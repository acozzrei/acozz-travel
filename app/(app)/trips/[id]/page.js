import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import TripView from "@/components/TripView";
import { shareCookieName, isValidShareSession } from "@/lib/shareAuth";

// Trip contents change constantly (add/edit/import), so always render fresh.
export const dynamic = "force-dynamic";

export default async function TripPage({ params }) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { items: { orderBy: { startTime: "asc" } } },
  });
  if (!trip) notFound();

  // The same password that protects this trip's public share link (if one is
  // set) also protects the owner's own view of it — a trip with a password
  // requires that password no matter which URL is used to reach it.
  if (trip.sharePassword) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(shareCookieName(trip.id))?.value;
    const authed = await isValidShareSession(trip.id, trip.sharePassword, cookieValue);
    if (!authed) redirect(`/trips/${id}/login`);
  }

  return <TripView initialTrip={trip} />;
}
