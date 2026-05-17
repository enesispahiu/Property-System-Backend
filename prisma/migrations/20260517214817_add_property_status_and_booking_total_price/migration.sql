-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "totalPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';
