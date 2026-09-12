-- AlterTable
ALTER TABLE "ItineraryItem" ADD COLUMN "estimatedCost" DOUBLE PRECISION;
ALTER TABLE "ItineraryItem" ADD COLUMN "bookingUrl" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "duffelApiKey" TEXT;
