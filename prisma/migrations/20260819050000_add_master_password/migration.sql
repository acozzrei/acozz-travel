-- AlterTable
-- Full-access password for all trips (see Trip.sharePassword's comment for
-- how the two levels interact).
ALTER TABLE "Settings" ADD COLUMN "masterPassword" TEXT;
