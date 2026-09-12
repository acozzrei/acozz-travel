import { prisma } from "@/lib/prisma";

// Idempotent schema guard: applies additive migrations with plain DDL so the
// app self-heals when the database is behind the code (e.g. production,
// where the app's own connection is the only one available). Runs once per
// server instance; safe to call on every request.
const STATEMENTS = [
  `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "gmailImapEmail" TEXT`,
  `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "gmailImapPasswordEnc" TEXT`,
  `ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "gmailImapDataKey" TEXT`,
];

let ensured = false;

export async function ensureSchema() {
  if (ensured) return;
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  ensured = true;
}
