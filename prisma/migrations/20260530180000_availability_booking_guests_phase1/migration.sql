ALTER TABLE "Booking" ADD COLUMN "guestCount" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Availability" ADD COLUMN "reason" TEXT;
ALTER TABLE "Availability" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Availability_propertyId_idx" ON "Availability"("propertyId");
