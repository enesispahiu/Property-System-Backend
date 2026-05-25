import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { PrismaClient, type Prisma, type Property } from '../generated/prisma';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
} satisfies Prisma.PrismaClientOptions);

const roleNames = ['SUPER_ADMIN', 'TENANT_ADMIN', 'USER'];

const tenantSeeds = [
  {
    name: 'Hotel Prishtina',
    slug: 'hotel-prishtina',
    primaryColor: '#ff385c',
    adminEmail: 'admin@hotel.com',
    properties: [
      {
        title: 'Modern Apartment',
        location: 'Prishtina',
        price: 80,
        description: 'A bright modern apartment close to cafes and city transit.',
      },
      {
        title: 'City Center Studio',
        location: 'Prishtina',
        price: 45,
        description: 'A compact studio in the center with fast access to shops.',
      },
      {
        title: 'Luxury Penthouse',
        location: 'Prishtina',
        price: 200,
        description: 'A polished penthouse with premium finishes and city views.',
      },
    ],
  },
  {
    name: 'Villa Peja',
    slug: 'villa-peja',
    primaryColor: '#0ea5a4',
    adminEmail: 'admin@villa.com',
    properties: [
      {
        title: 'Mountain House',
        location: 'Peja',
        price: 90,
        description: 'A peaceful mountain house near trails and fresh air.',
      },
      {
        title: 'Cozy Villa',
        location: 'Peja',
        price: 120,
        description: 'A calm villa with generous space, parking, and a garden.',
      },
      {
        title: 'Riverside Cabin',
        location: 'Peja',
        price: 70,
        description: 'A quiet cabin near the river for short relaxing stays.',
      },
    ],
  },
];

async function upsertRole(name: string) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function upsertTenant(seed: (typeof tenantSeeds)[number]) {
  return prisma.tenant.upsert({
    where: { slug: seed.slug },
    update: {
      name: seed.name,
      primaryColor: seed.primaryColor,
    },
    create: {
      name: seed.name,
      slug: seed.slug,
      primaryColor: seed.primaryColor,
    },
  });
}

async function main() {
  const [superAdminRole, tenantAdminRole, userRole] = await Promise.all(
    roleNames.map((role) => upsertRole(role)),
  ).then((roles) => [
    roles.find((role) => role.name === 'SUPER_ADMIN')!,
    roles.find((role) => role.name === 'TENANT_ADMIN')!,
    roles.find((role) => role.name === 'USER')!,
  ]);

  const password = await bcrypt.hash('12345678', 12);

  await prisma.user.upsert({
    where: { email: 'superadmin@test.com' },
    update: {
      password,
      tenantId: null,
      roleId: superAdminRole.id,
    },
    create: {
      email: 'superadmin@test.com',
      password,
      tenantId: null,
      roleId: superAdminRole.id,
    },
  });

  const normalUser = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {
      password,
      tenantId: null,
      roleId: userRole.id,
    },
    create: {
      email: 'user@test.com',
      password,
      tenantId: null,
      roleId: userRole.id,
    },
  });

  const seededProperties: Property[] = [];

  for (const tenantSeed of tenantSeeds) {
    const tenant = await upsertTenant(tenantSeed);

    const tenantAdmin = await prisma.user.upsert({
      where: { email: tenantSeed.adminEmail },
      update: {
        password,
        tenantId: tenant.id,
        roleId: tenantAdminRole.id,
      },
      create: {
        email: tenantSeed.adminEmail,
        password,
        tenantId: tenant.id,
        roleId: tenantAdminRole.id,
      },
    });

    for (const property of tenantSeed.properties) {
      const existing = await prisma.property.findFirst({
        where: {
          title: property.title,
          tenantId: tenant.id,
        },
      });

      const savedProperty = existing
        ? await prisma.property.update({
            where: { id: existing.id },
            data: {
              ...property,
              tenantId: tenant.id,
              ownerId: tenantAdmin.id,
              status: 'ACTIVE',
            },
          })
        : await prisma.property.create({
            data: {
              ...property,
              tenantId: tenant.id,
              ownerId: tenantAdmin.id,
              status: 'ACTIVE',
            },
          });

      seededProperties.push(savedProperty);
    }
  }

  const bookingSeeds = seededProperties.slice(0, 2).map((property, index) => ({
    property,
    startDate: new Date(`2026-06-${10 + index * 7}`),
    endDate: new Date(`2026-06-${13 + index * 7}`),
    status: index === 0 ? 'CONFIRMED' : 'PENDING',
  }));

  for (const booking of bookingSeeds) {
    const exists = await prisma.booking.findFirst({
      where: {
        propertyId: booking.property.id,
        userId: normalUser.id,
        startDate: booking.startDate,
        endDate: booking.endDate,
      },
    });

    if (!exists) {
      await prisma.booking.create({
        data: {
          propertyId: booking.property.id,
          userId: normalUser.id,
          tenantId: booking.property.tenantId,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: booking.status,
          totalPrice: booking.property.price * 3,
        },
      });
    }
  }

  for (const property of seededProperties.slice(0, 2)) {
    const exists = await prisma.review.findFirst({
      where: {
        propertyId: property.id,
        userId: normalUser.id,
      },
    });

    if (!exists) {
      await prisma.review.create({
        data: {
          propertyId: property.id,
          userId: normalUser.id,
          tenantId: property.tenantId,
          rating: property.price > 100 ? 4 : 5,
          comment: `Great stay at ${property.title}.`,
        },
      });
    }
  }

  console.log('Seed completed.');
  console.log('SUPER_ADMIN: superadmin@test.com / 12345678');
  console.log('TENANT_ADMIN Hotel: admin@hotel.com / 12345678');
  console.log('TENANT_ADMIN Villa: admin@villa.com / 12345678');
  console.log('USER: user@test.com / 12345678');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
