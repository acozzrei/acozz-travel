import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateToken() {
  // 16 URL-safe characters — random enough that a shared link isn't
  // guessable, short enough to paste around comfortably.
  return crypto.randomBytes(12).toString("base64url");
}

/** Turns sharing on (idempotent — returns the existing token if already
 * shared, rather than rotating it every time someone re-opens the share
 * dialog). */
export async function POST(request, { params }) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const shareToken = trip.shareToken || generateToken();
  const updated = await prisma.trip.update({ where: { id }, data: { shareToken } });
  return NextResponse.json({ shareToken: updated.shareToken });
}

/** Revokes sharing — the old link stops working immediately. */
export async function DELETE(request, { params }) {
  const { id } = await params;
  await prisma.trip.update({ where: { id }, data: { shareToken: null } });
  return NextResponse.json({ ok: true });
}
