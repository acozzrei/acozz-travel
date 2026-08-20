-- AlterTable
-- App-wide read-only password for the home page's login gate (see
-- Settings.masterPassword's comment for how the two levels interact).
ALTER TABLE "Settings" ADD COLUMN "viewPassword" TEXT;
