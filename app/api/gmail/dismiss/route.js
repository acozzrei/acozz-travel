import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadTripAccess } from "@/lib/shareAuth";

export async function POST(request) {
  const { gmailMsgId, tripId } = await request.json().catch(() => ({}));
  if (!gmailMsgId) return NextResponse.json({ error: "gmailMsgId is required" }, { status: 400 });

  const { trip, accessLevel } = await loadTripAccess(tripId);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (accessLevel !== "full") {
    return NextResponse.json({ error: "Full access required" }, { status: 401 });
  }

  await prisma.importedEmail.upsert({
    where: { gmailMsgId },
    create: { gmailMsgId, decision: "dismissed" },
    update: { decision: "dismissed" },
  });
  return NextResponse.json({ ok: true });
}
