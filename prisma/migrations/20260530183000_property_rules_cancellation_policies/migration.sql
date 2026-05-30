CREATE TABLE "CancellationPolicy" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "refundPercent" INTEGER NOT NULL,
  "freeCancellationHours" INTEGER NOT NULL,
  "tenantId" INTEGER,
  "propertyId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyRule" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "propertyId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PropertyRule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Property" ADD COLUMN "cancellationPolicyId" INTEGER;

CREATE UNIQUE INDEX "CancellationPolicy_name_key" ON "CancellationPolicy"("name");
CREATE INDEX "CancellationPolicy_tenantId_idx" ON "CancellationPolicy"("tenantId");
CREATE INDEX "CancellationPolicy_propertyId_idx" ON "CancellationPolicy"("propertyId");
CREATE INDEX "PropertyRule_propertyId_idx" ON "PropertyRule"("propertyId");

ALTER TABLE "Property" ADD CONSTRAINT "Property_cancellationPolicyId_fkey"
FOREIGN KEY ("cancellationPolicyId") REFERENCES "CancellationPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PropertyRule" ADD CONSTRAINT "PropertyRule_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
