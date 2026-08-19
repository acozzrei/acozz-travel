import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uniqueTripSlug } from "@/lib/slug";

export async function GET() {
  const trips = await prisma.trip.findMany({
    orderBy: { startDate: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json(trips);
}

export async function POST(request) {
  const body = await request.json();
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Trip name is required" }, { status: 400 });
  }
  const slug = await uniqueTripSlug(body.name.trim());
  const trip = await prisma.trip.create({
    data: {
      name: body.name.trim(),
      slug,
      destination: body.destination || null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      coverPhoto: body.coverPhoto || null,
    },
  });
  return NextResponse.json(trip, { status: 201 });
}
