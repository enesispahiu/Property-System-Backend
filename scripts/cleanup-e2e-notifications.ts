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

const knownE2eNotificationPatterns = [
  'Phase 1 Empty Tenant',
  'Phase 1 Other Tenant',
  'Phase 1 Property Tenant',
  'Phase 2 Tenant',
  'Phase 2 Property Tenant',
  'Other Tenant Property',
  'Tenant A Scoped Listing',
  'Phase 2 Active Property',
];

const seedDemoNotificationPatterns = [
  'L. Sirius Hotel',
  'Swiss D. Urban Stays',
  'Emerald Garden Villa',
  'Rugova Alpine Group',
  'Brezovica Snow Stays',
];

async function main() {
  const candidates = await prisma.notification.findMany({
    where: {
      OR: knownE2eNotificationPatterns.flatMap((pattern) => [
        { title: { contains: pattern } },
        { message: { contains: pattern } },
      ]),
      NOT: {
        OR: seedDemoNotificationPatterns.flatMap((pattern) => [
          { title: { contains: pattern } },
          { message: { contains: pattern } },
        ]),
      },
    },
    select: {
      id: true,
      title: true,
      message: true,
    },
  });

  if (candidates.length === 0) {
    console.log('Deleted 0 known e2e/test notifications.');
    console.log('Seed/demo notification patterns were excluded.');
    return;
  }

  const result = await prisma.notification.deleteMany({
    where: {
      id: { in: candidates.map((notification) => notification.id) },
    },
  });

  console.log(`Deleted ${result.count} known e2e/test notifications.`);
  console.log('Matched notification ids:');
  for (const notification of candidates) {
    console.log(
      `- #${notification.id} ${notification.title}: ${notification.message}`,
    );
  }
  console.log('Seed/demo notification patterns were excluded.');
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
