import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  const { gmailMsgId } = await request.json();
  if (!gmailMsgId) return NextResponse.json({ error: "gmailMsgId is required" }, { status: 400 });
  await prisma.importedEmail.upsert({
    where: { gmailMsgId },
    create: { gmailMsgId, decision: "dismissed" },
    update: { decision: "dismissed" },
  });
  return NextResponse.json({ ok: true });
}
