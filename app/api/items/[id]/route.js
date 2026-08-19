import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const body = await request.json();
  const data = {};
  for (const f of FIELDS) {
    if (body[f] !== undefined) data[f] = body[f];
  }
  if (body.startTime !== undefined) data.startTime = body.startTime ? new Date(body.startTime) : null;
  if (body.endTime !== undefined) data.endTime = body.endTime ? new Date(body.endTime) : null;

  const item = await prisma.itineraryItem.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.itineraryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
