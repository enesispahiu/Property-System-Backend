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

const knownE2eTitlePrefixes = [
  'Other Tenant Property ',
  'Tenant A Scoped Listing ',
  'Phase 1 CRUD Apartment ',
  'Phase 1 Updated Apartment ',
  'Phase 2 Active Property ',
  'Phase 2 Inactive Property ',
];

async function main() {
  const properties = await prisma.property.findMany({
    where: {
      status: 'ACTIVE',
      tenant: {
        OR: [
          { slug: { startsWith: 'phase1-' } },
          { slug: { startsWith: 'phase2-' } },
        ],
      },
      OR: knownE2eTitlePrefixes.map((prefix) => ({
        title: { startsWith: prefix },
      })),
    },
    select: {
      id: true,
      title: true,
      tenant: { select: { slug: true } },
    },
  });

  if (properties.length === 0) {
    console.log('No active e2e public properties found.');
    return;
  }

  const ids = properties.map((property) => property.id);

  await prisma.property.updateMany({
    where: { id: { in: ids } },
    data: { status: 'INACTIVE' },
  });

  console.log(`Deactivated ${ids.length} active e2e public properties:`);
  for (const property of properties) {
    console.log(
      `- #${property.id} ${property.title} (${property.tenant.slug})`,
    );
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
