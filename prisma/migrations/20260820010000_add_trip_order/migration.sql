-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: preserve the existing startDate-based ordering as the initial
-- manual order, so switching to drag-and-drop doesn't visually reshuffle
-- trips that no one has dragged yet.
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "startDate" ASC NULLS LAST, "createdAt" ASC) - 1 AS rn
  FROM "Trip"
)
UPDATE "Trip"
SET "order" = ordered.rn
FROM ordered
WHERE "Trip"."id" = ordered."id";
