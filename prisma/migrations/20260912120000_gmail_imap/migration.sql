-- AlterTable (idempotent: safe to re-run via `prisma migrate deploy`
-- even if the app's self-healing DDL already added these columns)
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "gmailImapEmail" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "gmailImapPasswordEnc" TEXT;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "gmailImapDataKey" TEXT;
