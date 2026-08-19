-- AlterTable
-- The trip-password feature has been fully retired: sharing is now purely
-- structural (owner-only /trips/[slug] "backend" vs. public read-only
-- /share/[slug]), so there's nothing left reading or writing this column.
ALTER TABLE "Trip" DROP COLUMN "sharePassword";
