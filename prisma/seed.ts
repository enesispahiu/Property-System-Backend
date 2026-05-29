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
const categoryNames = [
  'Hotel Room',
  'Apartment',
  'Studio',
  'Suite',
  'Penthouse',
  'Villa',
  'Cabin',
  'House',
  'Chalet',
];
const amenityNames = [
  'WiFi',
  'Parking',
  'Kitchen',
  'Air Conditioning',
  'Balcony',
  'Breakfast',
  'Sea View',
  'Lake View',
  'Mountain View',
  'City View',
  'Workspace',
  'Family Friendly',
  'Spa Access',
  'Ski Access',
  'Elevator',
  'Heating',
];

const tenantSeeds = [
  {
    name: 'L. Sirius Hotel',
    slug: 'l-sirius-hptel',
    primaryColor: '#ff385c',
    adminEmail: 'admin@lsirius.com',
  },
  {
    name: 'Swiss D. Urban Stays',
    slug: 'swiss-d-urban-stays',
    primaryColor: '#2563eb',
    adminEmail: 'admin@swissdurban.com',
  },
  {
    name: 'Emerald Garden Villa',
    slug: 'emerald-garden-villa',
    primaryColor: '#16a34a',
    adminEmail: 'admin@emeraldgarden.com',
  },
  {
    name: 'Rugova Alpine Group',
    slug: 'rugova-alpine-group',
    primaryColor: '#0ea5a4',
    adminEmail: 'admin@rugovaalpine.com',
  },
  {
    name: 'Brezovica Snow Stays',
    slug: 'brezovica-snow-stays',
    primaryColor: '#7c3aed',
    adminEmail: 'admin@brezovicasnow.com',
  },
];

const propertySeeds = [
  {
    tenantSlug: 'l-sirius-hptel',
    title: 'L. Sirius City Room near Mother Teresa Boulevard',
    location: 'Prishtina',
    price: 85,
    category: 'Hotel Room',
    description:
      'A comfortable city room inspired by central Prishtina hotel stays, close to cafes, restaurants, and the main boulevard.',
    amenities: ['WiFi', 'Air Conditioning', 'Breakfast', 'City View', 'Elevator'],
  },
  {
    tenantSlug: 'l-sirius-hptel',
    title: 'L. Sirius Business Suite in Prishtina Center',
    location: 'Prishtina',
    price: 125,
    category: 'Suite',
    description:
      'A clean business-friendly suite for short stays, meetings, and weekend visits in central Prishtina.',
    amenities: ['WiFi', 'Air Conditioning', 'Workspace', 'Breakfast', 'City View'],
  },
  {
    tenantSlug: 'swiss-d-urban-stays',
    title: 'Swiss D. Premium Suite on the Main Square',
    location: 'Prishtina',
    price: 175,
    category: 'Suite',
    description:
      "A premium urban suite inspired by luxury stays near Prishtina's main pedestrian area.",
    amenities: [
      'WiFi',
      'Air Conditioning',
      'Breakfast',
      'Spa Access',
      'City View',
      'Elevator',
    ],
  },
  {
    tenantSlug: 'swiss-d-urban-stays',
    title: 'Swiss D. Skyline Apartment near the City Center',
    location: 'Prishtina',
    price: 115,
    category: 'Apartment',
    description:
      'A modern apartment with skyline views, suitable for couples and business travelers.',
    amenities: [
      'WiFi',
      'Kitchen',
      'Air Conditioning',
      'Balcony',
      'Workspace',
      'City View',
    ],
  },
  {
    tenantSlug: 'swiss-d-urban-stays',
    title: 'Grand Central Apartment in Prishtina',
    location: 'Prishtina',
    price: 70,
    category: 'Apartment',
    description:
      'A practical central apartment inspired by classic city hotel stays, close to shops and public transport.',
    amenities: ['WiFi', 'Kitchen', 'Air Conditioning', 'City View'],
  },
  {
    tenantSlug: 'emerald-garden-villa',
    title: 'Emerald Garden Villa near Prishtina Mall',
    location: 'Prishtina',
    price: 150,
    category: 'Villa',
    description:
      'A family-friendly villa near the Prishtina Mall area with parking, outdoor space, and easy road access.',
    amenities: ['WiFi', 'Parking', 'Kitchen', 'Air Conditioning', 'Family Friendly'],
  },
  {
    tenantSlug: 'emerald-garden-villa',
    title: 'Emerald Garden Studio near Veternik',
    location: 'Prishtina',
    price: 55,
    category: 'Studio',
    description:
      'A simple and bright studio for short stays near Veternik and the main road toward the city.',
    amenities: ['WiFi', 'Kitchen', 'Air Conditioning', 'Workspace'],
  },
  {
    tenantSlug: 'emerald-garden-villa',
    title: 'Emerald Garden Family Apartment',
    location: 'Prishtina',
    price: 95,
    category: 'Apartment',
    description:
      'A comfortable family apartment with parking and easy access to shopping and restaurants.',
    amenities: ['WiFi', 'Parking', 'Kitchen', 'Air Conditioning', 'Family Friendly'],
  },
  {
    tenantSlug: 'rugova-alpine-group',
    title: 'Rugova Valley Wooden Cabin',
    location: 'Rugova, Peja',
    price: 95,
    category: 'Cabin',
    description:
      'A peaceful wooden cabin inspired by mountain stays in Rugova Valley, ideal for hiking and quiet weekends.',
    amenities: ['WiFi', 'Parking', 'Kitchen', 'Mountain View', 'Family Friendly'],
  },
  {
    tenantSlug: 'rugova-alpine-group',
    title: 'Peja Riverside Guest House',
    location: 'Peja',
    price: 82,
    category: 'House',
    description:
      'A riverside guest house close to Peja city and the entrance to Rugova Gorge.',
    amenities: ['WiFi', 'Parking', 'Kitchen', 'Balcony', 'Mountain View'],
  },
  {
    tenantSlug: 'rugova-alpine-group',
    title: 'Rugove Mountain Stay',
    location: 'Boga, Rugova',
    price: 105,
    category: 'Cabin',
    description:
      'A mountain stay inspired by the scenic Rugova area, suitable for nature lovers and weekend trips.',
    amenities: ['WiFi', 'Parking', 'Kitchen', 'Mountain View', 'Family Friendly'],
  },
  {
    tenantSlug: 'brezovica-snow-stays',
    title: 'Brezovica Alpine Chalet',
    location: 'Brezovica',
    price: 145,
    category: 'Chalet',
    description:
      'A warm alpine chalet inspired by winter stays near the Brezovica ski area.',
    amenities: [
      'WiFi',
      'Parking',
      'Kitchen',
      'Mountain View',
      'Ski Access',
      'Family Friendly',
    ],
  },
  {
    tenantSlug: 'brezovica-snow-stays',
    title: 'Sharr Mountain Villa',
    location: 'Brezovica',
    price: 130,
    category: 'Cabin',
    description:
      'A cozy lodge for families and groups visiting the Sharr Mountains during winter or summer.',
    amenities: ['WiFi', 'Parking', 'Kitchen', 'Mountain View', 'Ski Access'],
  },
  {
    tenantSlug: 'brezovica-snow-stays',
    title: 'Snow View Apartment Brezovica',
    location: 'Brezovica',
    price: 90,
    category: 'Apartment',
    description:
      'A compact apartment with mountain views, suitable for couples and ski weekend trips.',
    amenities: ['WiFi', 'Kitchen', 'Heating', 'Mountain View', 'Ski Access'],
  },
];

const propertyImagesByTitle: Record<string, string> = {
  'L. Sirius City Room near Mother Teresa Boulevard':
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
  'L. Sirius Business Suite in Prishtina Center':
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  'Swiss D. Premium Suite on the Main Square':
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
  'Swiss D. Skyline Apartment near the City Center':
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  'Grand Central Apartment in Prishtina':
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  'Emerald Garden Villa near Prishtina Mall':
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'Emerald Garden Studio near Veternik':
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=1200&q=80',
  'Emerald Garden Family Apartment':
    'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80',
  'Rugova Valley Wooden Cabin':
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
  'Peja Riverside Guest House':
    'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1200&q=80',
  'Rugove Mountain Stay':
    'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=80',
  'Brezovica Alpine Chalet':
    'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1200&q=80',
  'Sharr Mountain Villa':
    'https://images.unsplash.com/photo-1601918774946-25832a4be0d6?auto=format&fit=crop&w=1200&q=80',
  'Snow View Apartment Brezovica':
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
};

const reviewSeeds = [
  {
    propertyTitle: 'L. Sirius City Room near Mother Teresa Boulevard',
    rating: 5,
    comment: 'Excellent location and very clean room.',
  },
  {
    propertyTitle: 'Rugova Valley Wooden Cabin',
    rating: 5,
    comment: 'Great mountain view and a peaceful stay.',
  },
  {
    propertyTitle: 'Emerald Garden Villa near Prishtina Mall',
    rating: 5,
    comment: 'Perfect place for a family weekend.',
  },
  {
    propertyTitle: 'Swiss D. Skyline Apartment near the City Center',
    rating: 4,
    comment: 'Comfortable apartment with easy access to the city.',
  },
  {
    propertyTitle: 'Peja Riverside Guest House',
    rating: 4,
    comment: 'Nice stay, good value, and friendly atmosphere.',
  },
];

async function upsertRole(name: string) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function findOrCreateCategory(name: string) {
  const existing = await prisma.category.findFirst({ where: { name } });

  return existing ?? prisma.category.create({ data: { name } });
}

async function findOrCreateAmenity(name: string) {
  const existing = await prisma.amenity.findFirst({ where: { name } });

  return existing ?? prisma.amenity.create({ data: { name } });
}

async function ensurePropertyImage(propertyId: number, url: string) {
  const existing = await prisma.propertyImage.findFirst({
    where: {
      propertyId,
      url,
    },
  });

  if (!existing) {
    await prisma.propertyImage.create({
      data: {
        propertyId,
        url,
      },
    });
  }
}

function validatePropertyImageSeeds() {
  const propertyTitles = propertySeeds.map((propertySeed) => propertySeed.title);
  const imageTitles = Object.keys(propertyImagesByTitle);
  const missingImageTitles = propertyTitles.filter(
    (title) => !propertyImagesByTitle[title],
  );
  const extraImageTitles = imageTitles.filter((title) => !propertyTitles.includes(title));
  const imageUrls = Object.values(propertyImagesByTitle);

  if (missingImageTitles.length > 0) {
    throw new Error(
      `Missing property image seed for: ${missingImageTitles.join(', ')}`,
    );
  }

  if (extraImageTitles.length > 0) {
    throw new Error(`Unknown property image seed for: ${extraImageTitles.join(', ')}`);
  }

  if (new Set(imageUrls).size !== imageUrls.length) {
    throw new Error('Property image seed URLs must be unique.');
  }
}

async function ensurePropertyAmenity(propertyId: number, amenityId: number) {
  const existing = await prisma.propertyAmenity.findFirst({
    where: {
      propertyId,
      amenityId,
    },
  });

  if (!existing) {
    await prisma.propertyAmenity.create({
      data: {
        propertyId,
        amenityId,
      },
    });
  }
}

function nightsBetween(startDate: Date, endDate: Date) {
  return Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
}

async function main() {
  validatePropertyImageSeeds();

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

  const tenantsBySlug = new Map<string, { id: number; adminId: number }>();

  for (const tenantSeed of tenantSeeds) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantSeed.slug },
      update: {
        name: tenantSeed.name,
        primaryColor: tenantSeed.primaryColor,
      },
      create: {
        name: tenantSeed.name,
        slug: tenantSeed.slug,
        primaryColor: tenantSeed.primaryColor,
      },
    });

    const admin = await prisma.user.upsert({
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

    tenantsBySlug.set(tenantSeed.slug, { id: tenant.id, adminId: admin.id });
  }

  const categoriesByName = new Map<string, number>();
  for (const categoryName of categoryNames) {
    const category = await findOrCreateCategory(categoryName);
    categoriesByName.set(categoryName, category.id);
  }

  const amenitiesByName = new Map<string, number>();
  for (const amenityName of amenityNames) {
    const amenity = await findOrCreateAmenity(amenityName);
    amenitiesByName.set(amenityName, amenity.id);
  }

  const propertiesByTitle = new Map<string, Property>();

  for (const propertySeed of propertySeeds) {
    const tenant = tenantsBySlug.get(propertySeed.tenantSlug);
    const categoryId = categoriesByName.get(propertySeed.category);

    if (!tenant || !categoryId) {
      throw new Error(`Invalid property seed: ${propertySeed.title}`);
    }

    const existing = await prisma.property.findFirst({
      where: {
        title: propertySeed.title,
        tenantId: tenant.id,
      },
    });

    const propertyData = {
      title: propertySeed.title,
      location: propertySeed.location,
      price: propertySeed.price,
      description: propertySeed.description,
      status: 'ACTIVE',
      tenantId: tenant.id,
      ownerId: tenant.adminId,
      categoryId,
    };

    const property = existing
      ? await prisma.property.update({
          where: { id: existing.id },
          data: propertyData,
        })
      : await prisma.property.create({ data: propertyData });

    await ensurePropertyImage(property.id, propertyImagesByTitle[property.title]);

    for (const amenityName of propertySeed.amenities) {
      const amenityId = amenitiesByName.get(amenityName);

      if (!amenityId) {
        throw new Error(`Unknown amenity: ${amenityName}`);
      }

      await ensurePropertyAmenity(property.id, amenityId);
    }

    propertiesByTitle.set(property.title, property);
  }

  const bookingPlan = [
    {
      propertyTitle: 'L. Sirius Business Suite in Prishtina Center',
      startDate: '2026-07-10',
      endDate: '2026-07-13',
      status: 'CONFIRMED',
    },
    {
      propertyTitle: 'Rugova Valley Wooden Cabin',
      startDate: '2026-08-14',
      endDate: '2026-08-16',
      status: 'PENDING',
    },
    {
      propertyTitle: 'Brezovica Alpine Chalet',
      startDate: '2026-12-18',
      endDate: '2026-12-22',
      status: 'CONFIRMED',
    },
    {
      propertyTitle: 'Emerald Garden Family Apartment',
      startDate: '2026-09-04',
      endDate: '2026-09-06',
      status: 'PENDING',
    },
  ];

  for (const bookingSeed of bookingPlan) {
    const property = propertiesByTitle.get(bookingSeed.propertyTitle);

    if (!property) {
      throw new Error(`Unknown booking property: ${bookingSeed.propertyTitle}`);
    }

    const startDate = new Date(`${bookingSeed.startDate}T00:00:00.000Z`);
    const endDate = new Date(`${bookingSeed.endDate}T00:00:00.000Z`);
    const existing = await prisma.booking.findFirst({
      where: {
        propertyId: property.id,
        userId: normalUser.id,
        startDate,
        endDate,
      },
    });

    if (!existing) {
      await prisma.booking.create({
        data: {
          propertyId: property.id,
          userId: normalUser.id,
          tenantId: property.tenantId,
          startDate,
          endDate,
          status: bookingSeed.status,
          totalPrice: nightsBetween(startDate, endDate) * property.price,
        },
      });
    }
  }

  for (const reviewSeed of reviewSeeds) {
    const property = propertiesByTitle.get(reviewSeed.propertyTitle);

    if (!property) {
      throw new Error(`Unknown review property: ${reviewSeed.propertyTitle}`);
    }

    const existing = await prisma.review.findFirst({
      where: {
        propertyId: property.id,
        userId: normalUser.id,
      },
    });

    if (existing) {
      await prisma.review.update({
        where: { id: existing.id },
        data: {
          rating: reviewSeed.rating,
          comment: reviewSeed.comment,
          tenantId: property.tenantId,
        },
      });
    } else {
      await prisma.review.create({
        data: {
          propertyId: property.id,
          userId: normalUser.id,
          tenantId: property.tenantId,
          rating: reviewSeed.rating,
          comment: reviewSeed.comment,
        },
      });
    }
  }

  console.log('Seed completed.');
  console.log('SUPER_ADMIN: superadmin@test.com / 12345678');
  console.log('USER: user@test.com / 12345678');
  console.log('TENANT_ADMIN L. Sirius Hotel: admin@lsirius.com / 12345678');
  console.log('TENANT_ADMIN Swiss D. Urban Stays: admin@swissdurban.com / 12345678');
  console.log('TENANT_ADMIN Emerald Garden Villa: admin@emeraldgarden.com / 12345678');
  console.log('TENANT_ADMIN Rugova Alpine Group: admin@rugovaalpine.com / 12345678');
  console.log('TENANT_ADMIN Brezovica Snow Stays: admin@brezovicasnow.com / 12345678');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
