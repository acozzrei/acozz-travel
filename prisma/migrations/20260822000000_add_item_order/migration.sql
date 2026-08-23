-- AlterTable
ALTER TABLE "ItineraryItem" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: preserve the existing startTime-based ordering within each trip
-- as the initial manual order, so switching to drag-and-drop doesn't
-- visually reshuffle items no one has dragged yet.
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "tripId" ORDER BY "startTime" ASC NULLS LAST, "createdAt" ASC) - 1 AS rn
  FROM "ItineraryItem"
)
UPDATE "ItineraryItem"
SET "order" = ordered.rn
FROM ordered
WHERE "ItineraryItem"."id" = ordered."id";
