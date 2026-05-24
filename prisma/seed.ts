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

const roles = ['ADMIN', 'TENANT', 'USER'];

const properties = [
  {
    title: 'Modern Apartment',
    location: 'Prishtina',
    price: 80,
    description: 'A bright modern apartment close to cafes, offices, and city transit.',
  },
  {
    title: 'Cozy Villa',
    location: 'Prishtina',
    price: 120,
    description: 'A calm villa with generous living space, parking, and a private garden.',
  },
  {
    title: 'City Center Studio',
    location: 'Prishtina',
    price: 45,
    description: 'A compact studio in the center with fast access to restaurants and shops.',
  },
  {
    title: 'Mountain House',
    location: 'Peja',
    price: 90,
    description: 'A peaceful mountain house for quiet weekends near trails and fresh air.',
  },
  {
    title: 'Beach Apartment',
    location: 'Vlora',
    price: 110,
    description: 'A relaxed apartment near the beach with balcony space and sea air.',
  },
  {
    title: 'Luxury Penthouse',
    location: 'Prishtina',
    price: 200,
    description: 'A polished penthouse with premium finishes and wide city views.',
  },
];

async function findOrCreateRole(name: string) {
  const existing = await prisma.role.findFirst({ where: { name } });

  if (existing) {
    return existing;
  }

  return prisma.role.create({ data: { name } });
}

async function main() {
  const tenant =
    (await prisma.tenant.findFirst({ where: { name: 'Default Tenant' } })) ??
    (await prisma.tenant.create({ data: { name: 'Default Tenant' } }));

  const [adminRole, tenantRole] = await Promise.all(
    roles.map((role) => findOrCreateRole(role)),
  ).then((createdRoles) => [
    createdRoles.find((role) => role.name === 'ADMIN')!,
    createdRoles.find((role) => role.name === 'TENANT')!,
  ]);

  const password = await bcrypt.hash('12345678', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'frontend@test.com' },
    update: {
      password,
      tenantId: tenant.id,
      roleId: adminRole.id,
    },
    create: {
      email: 'frontend@test.com',
      password,
      tenantId: tenant.id,
      roleId: adminRole.id,
    },
  });

  const normalUser = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {
      password,
      tenantId: tenant.id,
      roleId: tenantRole.id,
    },
    create: {
      email: 'user@test.com',
      password,
      tenantId: tenant.id,
      roleId: tenantRole.id,
    },
  });

  const seededProperties: Property[] = [];

  for (const property of properties) {
    const existing = await prisma.property.findFirst({
      where: {
        title: property.title,
        tenantId: tenant.id,
      },
    });

    if (existing) {
      seededProperties.push(
        await prisma.property.update({
          where: { id: existing.id },
          data: {
            ...property,
            tenantId: tenant.id,
            ownerId: admin.id,
          },
        }),
      );
    } else {
      seededProperties.push(
        await prisma.property.create({
          data: {
            ...property,
            tenantId: tenant.id,
            ownerId: admin.id,
          },
        }),
      );
    }
  }

  const firstProperty = seededProperties[0];
  const secondProperty = seededProperties[1];

  const bookings = [
    {
      property: firstProperty,
      startDate: new Date('2026-06-10'),
      endDate: new Date('2026-06-13'),
      status: 'CONFIRMED',
    },
    {
      property: secondProperty,
      startDate: new Date('2026-07-02'),
      endDate: new Date('2026-07-05'),
      status: 'PENDING',
    },
  ];

  for (const booking of bookings) {
    const bookingExists = await prisma.booking.findFirst({
      where: {
        propertyId: booking.property.id,
        userId: normalUser.id,
        startDate: booking.startDate,
        endDate: booking.endDate,
      },
    });

    if (!bookingExists) {
      await prisma.booking.create({
        data: {
          propertyId: booking.property.id,
          userId: normalUser.id,
          tenantId: tenant.id,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: booking.status,
          totalPrice: booking.property.price * 3,
        },
      });
    }
  }

  const reviews = [
    {
      property: firstProperty,
      rating: 5,
      comment: 'Clean, comfortable, and easy to book.',
    },
    {
      property: secondProperty,
      rating: 4,
      comment: 'Great location and smooth check-in.',
    },
  ];

  for (const review of reviews) {
    const reviewExists = await prisma.review.findFirst({
      where: {
        propertyId: review.property.id,
        userId: normalUser.id,
      },
    });

    if (!reviewExists) {
      await prisma.review.create({
        data: {
          propertyId: review.property.id,
          userId: normalUser.id,
          tenantId: tenant.id,
          rating: review.rating,
          comment: review.comment,
        },
      });
    }
  }

  console.log('Seed completed.');
  console.log('Admin: frontend@test.com / 12345678');
  console.log('User: user@test.com / 12345678');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
