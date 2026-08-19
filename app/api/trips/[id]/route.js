import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request, { params }) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { items: { orderBy: { startTime: "asc" } } },
  });
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(trip);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.destination !== undefined) data.destination = body.destination;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.coverPhoto !== undefined) data.coverPhoto = body.coverPhoto;

  const trip = await prisma.trip.update({ where: { id }, data });
  return NextResponse.json(trip);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.trip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
