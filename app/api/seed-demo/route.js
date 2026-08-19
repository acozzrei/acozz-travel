import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEMO_TRIP, DEMO_ITEMS } from "@/lib/demoData";
import { uniqueTripSlug } from "@/lib/slug";

/** Creates the sample Grand Cayman trip (sourced from real booking emails)
 * so there's something real to look at right away. Safe to call more than
 * once — it skips creating a duplicate if a trip with this name exists. */
export async function POST() {
  const existing = await prisma.trip.findFirst({ where: { name: DEMO_TRIP.name } });
  if (existing) {
    return NextResponse.json({ trip: existing, created: false });
  }

  const slug = await uniqueTripSlug(DEMO_TRIP.name);
  const trip = await prisma.trip.create({
    data: {
      name: DEMO_TRIP.name,
      slug,
      destination: DEMO_TRIP.destination,
      startDate: new Date(DEMO_TRIP.startDate),
      endDate: new Date(DEMO_TRIP.endDate),
      coverPhoto: DEMO_TRIP.coverPhoto,
      items: {
        create: DEMO_ITEMS.map((item) => ({
          type: item.type,
          title: item.title,
          venueName: item.venueName,
          address: item.address,
          startTime: item.startTime ? new Date(item.startTime) : null,
          endTime: item.endTime ? new Date(item.endTime) : null,
          partySize: item.partySize ?? null,
          notes: item.notes || null,
          confirmationNo: item.confirmationNo || null,
          photoUrl: item.photoUrl || null,
          photoSource: item.photoSource || null,
          sourceEmailId: item.sourceEmailId || null,
          sourceSender: item.sourceSender || null,
          status: item.status || "confirmed",
        })),
      },
    },
  });

  // SQLite + Prisma doesn't support createMany's skipDuplicates, so upsert
  // one at a time instead.
  for (const i of DEMO_ITEMS) {
    if (!i.sourceEmailId) continue;
    await prisma.importedEmail.upsert({
      where: { gmailMsgId: i.sourceEmailId },
      create: { gmailMsgId: i.sourceEmailId, decision: "imported" },
      update: { decision: "imported" },
    });
  }

  return NextResponse.json({ trip, created: true });
}
