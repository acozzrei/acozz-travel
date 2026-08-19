import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import TripView from "@/components/TripView";
import { shareCookieName, isValidShareSession } from "@/lib/shareAuth";

// Trip contents change constantly (add/edit/import), so always render fresh.
export const dynamic = "force-dynamic";

export default async function TripPage({ params }) {
  const { slug } = await params;
  const trip = await prisma.trip.findUnique({
    where: { slug },
    include: { items: { orderBy: { startTime: "asc" } } },
  });
  if (!trip) notFound();

  // A trip's own password (set via its "Trip password" control, separate
  // from sharing) protects the owner's view of it — unaffected by whether
  // it's currently shared or what the share link needs.
  if (trip.sharePassword) {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(shareCookieName(trip.id))?.value;
    const authed = await isValidShareSession(trip.id, trip.sharePassword, cookieValue);
    if (!authed) redirect(`/trips/${slug}/login`);
  }

  return <TripView initialTrip={trip} />;
}
