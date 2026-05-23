/*
  Warnings:

  - Added the required column `tenantId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "tenantId" INTEGER;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "tenantId" INTEGER;

-- Backfill tenant ids from existing property relationships
UPDATE "Booking"
SET "tenantId" = p."tenantId"
FROM "Property" p
WHERE p."id" = "Booking"."propertyId";

UPDATE "Review"
SET "tenantId" = p."tenantId"
FROM "Property" p
WHERE p."id" = "Review"."propertyId";

-- Set tenant id to required after backfill
ALTER TABLE "Booking" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "tenantId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
