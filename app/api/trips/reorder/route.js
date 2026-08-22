import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getRequestAppAccess } from "@/lib/appAuth";

// Persists a drag-and-drop reorder of the home page's trip list. Gated the
// same way as the home page itself (the app-wide edit role), not per-trip
// access, since this reorders the whole list rather than editing one trip.
export async function POST(request) {
  const settings = await getSettings();
  const role = await getRequestAppAccess(settings);
  if (role !== "edit") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }

  const { order } = await request.json().catch(() => ({}));
  if (!Array.isArray(order) || order.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "order must be an array of trip ids" }, { status: 400 });
  }

  await prisma.$transaction(
    order.map((id, index) => prisma.trip.update({ where: { id }, data: { order: index } }))
  );
  return NextResponse.json({ ok: true });
}
