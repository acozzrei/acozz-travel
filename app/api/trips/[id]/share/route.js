import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadTripAccess } from "@/lib/shareAuth";

function generateToken() {
  // Just an on/off marker now (the share URL itself is the trip's slug, not
  // this value) — kept random regardless so nothing relies on its format.
  return crypto.randomBytes(12).toString("base64url");
}

/** Turns sharing on (idempotent — returns the existing token if already
 * shared, rather than rotating it every time someone re-opens the share
 * dialog). */
export async function POST(request, { params }) {
  const { id } = await params;
  const { trip, accessLevel } = await loadTripAccess(id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }

  const shareToken = trip.shareToken || generateToken();
  const updated = await prisma.trip.update({ where: { id: trip.id }, data: { shareToken } });
  return NextResponse.json({ shareToken: updated.shareToken, slug: updated.slug });
}

/** Revokes sharing — the old link stops working immediately. */
export async function DELETE(request, { params }) {
  const { id } = await params;
  const { trip, accessLevel } = await loadTripAccess(id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }
  await prisma.trip.update({ where: { id: trip.id }, data: { shareToken: null } });
  return NextResponse.json({ ok: true });
}
