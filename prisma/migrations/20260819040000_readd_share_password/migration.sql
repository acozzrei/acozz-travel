-- AlterTable
-- Re-adds the per-trip password column that was dropped in
-- 20260819030000_drop_share_password. The trip-password feature is back:
-- it protects the owner's own /trips/[slug] page, unrelated to sharing.
ALTER TABLE "Trip" ADD COLUMN "sharePassword" TEXT;
