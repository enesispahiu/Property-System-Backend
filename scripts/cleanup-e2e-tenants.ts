import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/prisma';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
} satisfies Prisma.PrismaClientOptions);

const seedTenantNames = new Set([
  'L. Sirius Hotel',
  'Swiss D. Urban Stays',
  'Emerald Garden Villa',
  'Rugova Alpine Group',
  'Brezovica Snow Stays',
]);

const e2eTenantMatchers = [
  { namePrefix: 'Phase 1 Other Tenant ', slugPrefix: 'phase1-other-tenant-' },
  {
    namePrefix: 'Phase 1 Property Tenant ',
    slugPrefix: 'phase1-property-tenant-',
  },
  { namePrefix: 'Phase 2 Tenant ', slugPrefix: 'phase2-tenant-' },
  {
    namePrefix: 'Phase 2 Property Tenant ',
    slugPrefix: 'phase2-property-tenant-',
  },
];

function isKnownE2eTenant(tenant: { name: string; slug: string }) {
  if (seedTenantNames.has(tenant.name)) {
    return false;
  }

  return e2eTenantMatchers.some(
    (matcher) =>
      tenant.name.startsWith(matcher.namePrefix) ||
      tenant.slug.startsWith(matcher.slugPrefix),
  );
}

async function main() {
  const candidates = await prisma.tenant.findMany({
    where: {
      OR: e2eTenantMatchers.flatMap((matcher) => [
        { name: { startsWith: matcher.namePrefix } },
        { slug: { startsWith: matcher.slugPrefix } },
      ]),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      _count: {
        select: {
          users: true,
          properties: true,
          bookings: true,
          reviews: true,
          notifications: true,
        },
      },
    },
  });

  const tenants = candidates.filter(isKnownE2eTenant);
  const tenantIds = tenants.map((tenant) => tenant.id);

  let propertiesDeactivated = 0;
  let tenantsDeactivated = 0;
  let tenantsDeleted = 0;

  if (tenantIds.length > 0) {
    const propertyResult = await prisma.property.updateMany({
      where: {
        tenantId: { in: tenantIds },
        status: { not: 'INACTIVE' },
      },
      data: { status: 'INACTIVE' },
    });
    propertiesDeactivated = propertyResult.count;
  }

  for (const tenant of tenants) {
    const hasRelatedData = Object.values(tenant._count).some(
      (count) => count > 0,
    );

    if (hasRelatedData) {
      if (tenant.status !== 'INACTIVE') {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { status: 'INACTIVE' },
        });
        tenantsDeactivated += 1;
      }
      continue;
    }

    await prisma.tenant.delete({ where: { id: tenant.id } });
    tenantsDeleted += 1;
  }

  console.log(`Matched ${tenants.length} known e2e tenants.`);
  console.log(`Deactivated ${propertiesDeactivated} e2e properties.`);
  console.log(`Deactivated ${tenantsDeactivated} e2e tenants.`);
  console.log(`Deleted ${tenantsDeleted} empty e2e tenants.`);
  console.log('Seed/demo tenant names were excluded from cleanup.');
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
