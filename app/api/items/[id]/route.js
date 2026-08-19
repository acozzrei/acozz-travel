import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadTripAccess } from "@/lib/shareAuth";

const FIELDS = [
  "type",
  "title",
  "venueName",
  "address",
  "partySize",
  "notes",
  "confirmationNo",
  "photoUrl",
  "photoSource",
  "status",
];

export async function PATCH(request, { params }) {
  const { id } = await params;
  const item = await prisma.itineraryItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { accessLevel } = await loadTripAccess(item.tripId);
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }

  const body = await request.json();
  const data = {};
  for (const f of FIELDS) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.startTime !== undefined) data.startTime = body.startTime ? new Date(body.startTime) : null;
  if (body.endTime !== undefined) data.endTime = body.endTime ? new Date(body.endTime) : null;

  const updated = await prisma.itineraryItem.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const item = await prisma.itineraryItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { accessLevel } = await loadTripAccess(item.tripId);
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }

  await prisma.itineraryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
