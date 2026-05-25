ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "domain" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;

UPDATE "Tenant"
SET "slug" = lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))
WHERE "slug" IS NULL OR "slug" = '';

UPDATE "Tenant"
SET "slug" = concat("slug", '-', "id")
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT "id", row_number() OVER (PARTITION BY "slug" ORDER BY "id") AS row_number
    FROM "Tenant"
  ) duplicates
  WHERE duplicates.row_number > 1
);

ALTER TABLE "Tenant" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

ALTER TABLE "User" ALTER COLUMN "tenantId" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_key" ON "Role"("name");
