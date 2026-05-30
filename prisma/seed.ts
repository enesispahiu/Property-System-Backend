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

const roleNames = ['SUPER_ADMIN', 'TENANT_ADMIN', 'USER'] as const;

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

const cancellationPolicySeeds = [
  {
    name: 'Flexible',
    description: 'Full refund until 24 hours before check-in.',
    refundPercent: 100,
    freeCancellationHours: 24,
  },
  {
    name: 'Moderate',
    description: 'Full refund until 5 days before check-in.',
    refundPercent: 100,
    freeCancellationHours: 120,
  },
  {
    name: 'Strict',
    description: '50% refund until 7 days before check-in.',
    refundPercent: 50,
    freeCancellationHours: 168,
  },
];

const tenantSeeds = [
  {
    name: 'L. Sirius Hotel',
    slug: 'l-sirius-hotel',
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
    tenantSlug: 'l-sirius-hotel',
    title: 'L. Sirius City Room near Mother Teresa Boulevard',
    location: 'Prishtina',
    price: 85,
    category: 'Hotel Room',
    policy: 'Flexible',
    description:
      'A polished hotel room near Mother Teresa Boulevard, ideal for short city visits, embassy appointments, and weekend stays in central Prishtina.',
    amenities: [
      'WiFi',
      'Air Conditioning',
      'Breakfast',
      'City View',
      'Elevator',
    ],
  },
  {
    tenantSlug: 'l-sirius-hotel',
    title: 'L. Sirius Business Suite in Prishtina Center',
    location: 'Prishtina',
    price: 125,
    category: 'Suite',
    policy: 'Moderate',
    description:
      'A business-ready suite in central Prishtina with a practical workspace, breakfast, and quick access to offices, restaurants, and government buildings.',
    amenities: [
      'WiFi',
      'Air Conditioning',
      'Workspace',
      'Breakfast',
      'City View',
    ],
  },
  {
    tenantSlug: 'swiss-d-urban-stays',
    title: 'Swiss D. Premium Suite on the Main Square',
    location: 'Prishtina',
    price: 175,
    category: 'Suite',
    policy: 'Moderate',
    description:
      "A premium urban suite near Prishtina's main pedestrian area, suited for guests who want hotel comfort, spa access, and a central base.",
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
    policy: 'Flexible',
    description:
      'A modern skyline apartment for couples and business travelers who want a kitchen, balcony, and reliable workspace close to the city center.',
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
    policy: 'Flexible',
    description:
      'A practical central apartment close to shops, public transport, and cafes, designed for affordable city stays without sacrificing comfort.',
    amenities: ['WiFi', 'Kitchen', 'Air Conditioning', 'City View'],
  },
  {
    tenantSlug: 'emerald-garden-villa',
    title: 'Emerald Garden Villa near Prishtina Mall',
    location: 'Prishtina',
    price: 150,
    category: 'Villa',
    policy: 'Moderate',
    description:
      'A family-friendly villa near Prishtina Mall with parking, a full kitchen, outdoor space, and easy road access for relaxed group stays.',
    amenities: [
      'WiFi',
      'Parking',
      'Kitchen',
      'Air Conditioning',
      'Family Friendly',
    ],
  },
  {
    tenantSlug: 'emerald-garden-villa',
    title: 'Emerald Garden Studio near Veternik',
    location: 'Prishtina',
    price: 55,
    category: 'Studio',
    policy: 'Flexible',
    description:
      'A bright Veternik studio for solo travelers or couples, with a compact kitchen, workspace, and fast access to the main road into Prishtina.',
    amenities: ['WiFi', 'Kitchen', 'Air Conditioning', 'Workspace'],
  },
  {
    tenantSlug: 'emerald-garden-villa',
    title: 'Emerald Garden Family Apartment',
    location: 'Prishtina',
    price: 95,
    category: 'Apartment',
    policy: 'Moderate',
    description:
      'A comfortable family apartment with parking, a full kitchen, and quick access to shopping, restaurants, and family activities around Prishtina.',
    amenities: [
      'WiFi',
      'Parking',
      'Kitchen',
      'Air Conditioning',
      'Family Friendly',
    ],
  },
  {
    tenantSlug: 'rugova-alpine-group',
    title: 'Rugova Valley Wooden Cabin',
    location: 'Rugova, Peja',
    price: 95,
    category: 'Cabin',
    policy: 'Strict',
    description:
      'A peaceful wooden cabin in Rugova Valley for hiking weekends, quiet mornings, mountain views, and relaxed stays close to Peja.',
    amenities: [
      'WiFi',
      'Parking',
      'Kitchen',
      'Mountain View',
      'Family Friendly',
      'Heating',
    ],
  },
  {
    tenantSlug: 'rugova-alpine-group',
    title: 'Peja Riverside Guest House',
    location: 'Peja',
    price: 82,
    category: 'House',
    policy: 'Moderate',
    description:
      'A riverside guest house near Peja city and the entrance to Rugova Gorge, useful for families, hikers, and longer weekend trips.',
    amenities: ['WiFi', 'Parking', 'Kitchen', 'Balcony', 'Mountain View'],
  },
  {
    tenantSlug: 'rugova-alpine-group',
    title: 'Rugove Mountain Stay',
    location: 'Boga, Rugova',
    price: 105,
    category: 'Cabin',
    policy: 'Strict',
    description:
      'A scenic mountain stay in Boga, Rugova, with a full kitchen, parking, and space for families planning nature-focused trips.',
    amenities: [
      'WiFi',
      'Parking',
      'Kitchen',
      'Mountain View',
      'Family Friendly',
      'Heating',
    ],
  },
  {
    tenantSlug: 'brezovica-snow-stays',
    title: 'Brezovica Alpine Chalet',
    location: 'Brezovica',
    price: 145,
    category: 'Chalet',
    policy: 'Strict',
    description:
      'A warm alpine chalet near the Brezovica ski area with ski access, mountain views, heating, and room for family winter trips.',
    amenities: [
      'WiFi',
      'Parking',
      'Kitchen',
      'Mountain View',
      'Ski Access',
      'Family Friendly',
      'Heating',
    ],
  },
  {
    tenantSlug: 'brezovica-snow-stays',
    title: 'Sharr Mountain Villa',
    location: 'Brezovica',
    price: 130,
    category: 'Villa',
    policy: 'Moderate',
    description:
      'A cozy Sharr Mountain villa for families and groups visiting Brezovica in winter or summer, with parking, heating, and ski access nearby.',
    amenities: [
      'WiFi',
      'Parking',
      'Kitchen',
      'Mountain View',
      'Ski Access',
      'Heating',
    ],
  },
  {
    tenantSlug: 'brezovica-snow-stays',
    title: 'Snow View Apartment Brezovica',
    location: 'Brezovica',
    price: 90,
    category: 'Apartment',
    policy: 'Moderate',
    description:
      'A compact Brezovica apartment with mountain views, heating, and ski access for couples or small groups planning a snow weekend.',
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

const availabilitySeeds = [
  {
    propertyTitle: 'Brezovica Alpine Chalet',
    startDate: '2026-12-24',
    endDate: '2026-12-27',
    reason: 'Holiday maintenance block',
  },
  {
    propertyTitle: 'Sharr Mountain Villa',
    startDate: '2026-12-29',
    endDate: '2027-01-02',
    reason: 'Private owner stay',
  },
  {
    propertyTitle: 'Rugova Valley Wooden Cabin',
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    reason: 'Maintenance',
  },
  {
    propertyTitle: 'L. Sirius Business Suite in Prishtina Center',
    startDate: '2026-07-20',
    endDate: '2026-07-21',
    reason: 'Corporate event block',
  },
];

const bookingSeeds = [
  {
    propertyTitle: 'L. Sirius Business Suite in Prishtina Center',
    startDate: '2026-07-10',
    endDate: '2026-07-13',
    status: 'CONFIRMED',
    paymentMethod: 'CARD',
    invoiceNumber: 'INV-2026-0001',
    guestCount: 2,
  },
  {
    propertyTitle: 'Rugova Valley Wooden Cabin',
    startDate: '2026-08-14',
    endDate: '2026-08-16',
    status: 'PENDING',
    guestCount: 1,
  },
  {
    propertyTitle: 'Brezovica Alpine Chalet',
    startDate: '2026-12-18',
    endDate: '2026-12-22',
    status: 'CONFIRMED',
    paymentMethod: 'BANK_TRANSFER',
    invoiceNumber: 'INV-2026-0002',
    guestCount: 3,
  },
  {
    propertyTitle: 'Emerald Garden Family Apartment',
    startDate: '2026-09-04',
    endDate: '2026-09-06',
    status: 'CANCELLED',
    guestCount: 2,
  },
];

const favoritePropertyTitles = [
  'Swiss D. Premium Suite on the Main Square',
  'Rugova Valley Wooden Cabin',
  'Snow View Apartment Brezovica',
];

const reviewSeeds = [
  {
    propertyTitle: 'L. Sirius City Room near Mother Teresa Boulevard',
    rating: 5,
    comment: 'Excellent location and a very clean room for a quick city stay.',
  },
  {
    propertyTitle: 'Rugova Valley Wooden Cabin',
    rating: 5,
    comment: 'Great mountain view, warm cabin, and a peaceful weekend.',
  },
  {
    propertyTitle: 'Emerald Garden Villa near Prishtina Mall',
    rating: 5,
    comment: 'Perfect place for a family weekend with easy parking.',
  },
  {
    propertyTitle: 'Swiss D. Skyline Apartment near the City Center',
    rating: 4,
    comment: 'Comfortable apartment with easy access to the city center.',
  },
  {
    propertyTitle: 'Peja Riverside Guest House',
    rating: 4,
    comment: 'Nice stay, good value, and a friendly atmosphere near the river.',
  },
  {
    propertyTitle: 'Brezovica Alpine Chalet',
    rating: 5,
    comment: 'A warm winter stay with mountain views and easy ski access.',
  },
];

const searchHistoryQueries = [
  'location: Prishtina',
  'location: Brezovica',
  'category: Cabin',
  'maxPrice: 100',
  'family friendly mountain stay',
];

type TenantSeedResult = { id: number; adminId: number; adminEmail: string };

function dateFromSeed(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function nightsBetween(startDate: Date, endDate: Date) {
  return Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function validatePropertyImageSeeds() {
  const propertyTitles = propertySeeds.map(
    (propertySeed) => propertySeed.title,
  );
  const imageTitles = Object.keys(propertyImagesByTitle);
  const missingImageTitles = propertyTitles.filter(
    (title) => !propertyImagesByTitle[title],
  );
  const extraImageTitles = imageTitles.filter(
    (title) => !propertyTitles.includes(title),
  );
  const imageUrls = Object.values(propertyImagesByTitle);

  if (missingImageTitles.length > 0) {
    throw new Error(
      `Missing property image seed for: ${missingImageTitles.join(', ')}`,
    );
  }

  if (extraImageTitles.length > 0) {
    throw new Error(
      `Unknown property image seed for: ${extraImageTitles.join(', ')}`,
    );
  }

  if (new Set(imageUrls).size !== imageUrls.length) {
    throw new Error('Property image seed URLs must be unique.');
  }
}

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
    where: { propertyId, url },
  });

  if (!existing) {
    await prisma.propertyImage.create({ data: { propertyId, url } });
  }
}

async function ensurePropertyAmenity(propertyId: number, amenityId: number) {
  const existing = await prisma.propertyAmenity.findFirst({
    where: { propertyId, amenityId },
  });

  if (!existing) {
    await prisma.propertyAmenity.create({ data: { propertyId, amenityId } });
  }
}

async function ensureAvailability(
  propertyId: number,
  startDate: Date,
  endDate: Date,
  reason: string,
) {
  const existing = await prisma.availability.findFirst({
    where: { propertyId, startDate, endDate, reason },
  });

  if (!existing) {
    await prisma.availability.create({
      data: { propertyId, startDate, endDate, reason },
    });
  }
}

async function ensurePaymentAndInvoice(
  booking: { id: number; totalPrice: number | null },
  paymentMethod: string,
  invoiceNumber: string,
  billingEmail: string,
) {
  const amount = booking.totalPrice ?? 0;
  let payment = await prisma.payment.findFirst({
    where: { bookingId: booking.id, status: 'PAID' },
  });

  if (payment) {
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: { amount, status: 'PAID', method: paymentMethod },
    });
  } else {
    payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount,
        status: 'PAID',
        method: paymentMethod,
      },
    });
  }

  const existingByBooking = await prisma.invoice.findFirst({
    where: { bookingId: booking.id },
  });

  const invoiceData = {
    invoiceNumber,
    bookingId: booking.id,
    paymentId: payment.id,
    status: 'PAID',
    subtotal: amount,
    taxAmount: 0,
    totalAmount: amount,
    billingName: 'Enes Spahiu',
    billingEmail,
    paidAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  if (existingByBooking) {
    await prisma.invoice.update({
      where: { id: existingByBooking.id },
      data: invoiceData,
    });
    return;
  }

  await prisma.invoice.upsert({
    where: { invoiceNumber },
    update: invoiceData,
    create: invoiceData,
  });
}

async function ensureNotification(data: {
  title: string;
  message: string;
  type: string;
  userId?: number;
  tenantId?: number;
  bookingId?: number;
  readAt?: Date | null;
}) {
  const existing = await prisma.notification.findFirst({
    where: {
      title: data.title,
      type: data.type,
      userId: data.userId ?? null,
      tenantId: data.tenantId ?? null,
      bookingId: data.bookingId ?? null,
    },
  });

  if (existing) {
    await prisma.notification.update({
      where: { id: existing.id },
      data: { message: data.message, readAt: data.readAt ?? null },
    });
    return;
  }

  await prisma.notification.create({
    data: {
      title: data.title,
      message: data.message,
      type: data.type,
      userId: data.userId,
      tenantId: data.tenantId,
      bookingId: data.bookingId,
      readAt: data.readAt,
    },
  });
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

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@test.com' },
    update: { password, tenantId: null, roleId: superAdminRole.id },
    create: {
      email: 'superadmin@test.com',
      password,
      tenantId: null,
      roleId: superAdminRole.id,
    },
  });

  const normalUser = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: { password, tenantId: null, roleId: userRole.id },
    create: {
      email: 'user@test.com',
      password,
      tenantId: null,
      roleId: userRole.id,
    },
  });

  const tenantsBySlug = new Map<string, TenantSeedResult>();

  for (const tenantSeed of tenantSeeds) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: tenantSeed.slug },
      update: {
        name: tenantSeed.name,
        primaryColor: tenantSeed.primaryColor,
        status: 'ACTIVE',
      },
      create: {
        name: tenantSeed.name,
        slug: tenantSeed.slug,
        primaryColor: tenantSeed.primaryColor,
        status: 'ACTIVE',
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

    tenantsBySlug.set(tenantSeed.slug, {
      id: tenant.id,
      adminId: admin.id,
      adminEmail: tenantSeed.adminEmail,
    });
  }

  const categoriesByName = new Map<string, number>();
  for (const categoryName of categoryNames) {
    const category = await findOrCreateCategory(categoryName);
    categoriesByName.set(category.name, category.id);
  }

  const amenitiesByName = new Map<string, number>();
  for (const amenityName of amenityNames) {
    const amenity = await findOrCreateAmenity(amenityName);
    amenitiesByName.set(amenity.name, amenity.id);
  }

  const policiesByName = new Map<string, number>();
  for (const policySeed of cancellationPolicySeeds) {
    const policy = await prisma.cancellationPolicy.upsert({
      where: { name: policySeed.name },
      update: policySeed,
      create: policySeed,
    });
    policiesByName.set(policy.name, policy.id);
  }

  const propertiesByTitle = new Map<string, Property>();

  for (const propertySeed of propertySeeds) {
    const tenant = tenantsBySlug.get(propertySeed.tenantSlug);
    const categoryId = categoriesByName.get(propertySeed.category);
    const cancellationPolicyId = policiesByName.get(propertySeed.policy);

    if (!tenant || !categoryId || !cancellationPolicyId) {
      throw new Error(`Invalid property seed: ${propertySeed.title}`);
    }

    const existing = await prisma.property.findFirst({
      where: { title: propertySeed.title, tenantId: tenant.id },
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
      cancellationPolicyId,
    };

    const property = existing
      ? await prisma.property.update({
          where: { id: existing.id },
          data: propertyData,
        })
      : await prisma.property.create({ data: propertyData });

    await ensurePropertyImage(
      property.id,
      propertyImagesByTitle[property.title],
    );

    for (const amenityName of propertySeed.amenities) {
      const amenityId = amenitiesByName.get(amenityName);

      if (!amenityId) {
        throw new Error(`Unknown amenity: ${amenityName}`);
      }

      await ensurePropertyAmenity(property.id, amenityId);
    }

    propertiesByTitle.set(property.title, property);
  }

  for (const availabilitySeed of availabilitySeeds) {
    const property = propertiesByTitle.get(availabilitySeed.propertyTitle);

    if (!property) {
      throw new Error(
        `Unknown availability property: ${availabilitySeed.propertyTitle}`,
      );
    }

    await ensureAvailability(
      property.id,
      dateFromSeed(availabilitySeed.startDate),
      dateFromSeed(availabilitySeed.endDate),
      availabilitySeed.reason,
    );
  }

  const bookingsByPropertyTitle = new Map<
    string,
    { id: number; status: string }
  >();

  for (const bookingSeed of bookingSeeds) {
    const property = propertiesByTitle.get(bookingSeed.propertyTitle);

    if (!property) {
      throw new Error(`Unknown booking property: ${bookingSeed.propertyTitle}`);
    }

    const startDate = dateFromSeed(bookingSeed.startDate);
    const endDate = dateFromSeed(bookingSeed.endDate);
    const totalPrice = nightsBetween(startDate, endDate) * property.price;
    const guestCount = bookingSeed.guestCount;
    const existing = await prisma.booking.findFirst({
      where: {
        propertyId: property.id,
        userId: normalUser.id,
        startDate,
        endDate,
      },
    });

    const booking = existing
      ? await prisma.booking.update({
          where: { id: existing.id },
          data: {
            status: bookingSeed.status,
            totalPrice,
            guestCount,
            tenantId: property.tenantId,
          },
        })
      : await prisma.booking.create({
          data: {
            propertyId: property.id,
            userId: normalUser.id,
            tenantId: property.tenantId,
            startDate,
            endDate,
            status: bookingSeed.status,
            totalPrice,
            guestCount,
          },
        });

    if (
      bookingSeed.status === 'CONFIRMED' &&
      bookingSeed.paymentMethod &&
      bookingSeed.invoiceNumber
    ) {
      await ensurePaymentAndInvoice(
        booking,
        bookingSeed.paymentMethod,
        bookingSeed.invoiceNumber,
        normalUser.email,
      );
    }

    bookingsByPropertyTitle.set(bookingSeed.propertyTitle, booking);
  }

  for (const title of favoritePropertyTitles) {
    const property = propertiesByTitle.get(title);

    if (!property || property.status !== 'ACTIVE') {
      throw new Error(`Unknown or inactive favorite property: ${title}`);
    }

    await prisma.favoriteProperty.upsert({
      where: {
        userId_propertyId: {
          userId: normalUser.id,
          propertyId: property.id,
        },
      },
      update: {},
      create: {
        userId: normalUser.id,
        propertyId: property.id,
      },
    });
  }

  for (const reviewSeed of reviewSeeds) {
    const property = propertiesByTitle.get(reviewSeed.propertyTitle);

    if (!property) {
      throw new Error(`Unknown review property: ${reviewSeed.propertyTitle}`);
    }

    const existing = await prisma.review.findFirst({
      where: { propertyId: property.id, userId: normalUser.id },
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

  for (const query of searchHistoryQueries) {
    const existing = await prisma.searchHistory.findFirst({ where: { query } });

    if (!existing) {
      await prisma.searchHistory.create({ data: { query } });
    }
  }

  const pendingBooking = bookingsByPropertyTitle.get(
    'Rugova Valley Wooden Cabin',
  );
  const firstConfirmedBooking = bookingsByPropertyTitle.get(
    'L. Sirius Business Suite in Prishtina Center',
  );
  const secondConfirmedBooking = bookingsByPropertyTitle.get(
    'Brezovica Alpine Chalet',
  );
  const cancelledBooking = bookingsByPropertyTitle.get(
    'Emerald Garden Family Apartment',
  );
  const lSiriusTenant = tenantsBySlug.get('l-sirius-hotel');
  const rugovaTenant = tenantsBySlug.get('rugova-alpine-group');
  const emeraldTenant = tenantsBySlug.get('emerald-garden-villa');

  if (lSiriusTenant) {
    await ensureNotification({
      title: 'Tenant updated',
      message: 'Tenant L. Sirius Hotel was updated.',
      type: 'PLATFORM_TENANT_UPDATED',
      userId: superAdmin.id,
    });
    await ensureNotification({
      title: 'Tenant admin created',
      message:
        'Tenant admin admin@lsirius.com was created for L. Sirius Hotel.',
      type: 'PLATFORM_TENANT_ADMIN_CREATED',
      userId: superAdmin.id,
    });
  }

  if (pendingBooking) {
    await ensureNotification({
      title: 'Booking created',
      message:
        'Your booking for Rugova Valley Wooden Cabin is pending payment.',
      type: 'BOOKING',
      userId: normalUser.id,
      bookingId: pendingBooking.id,
    });
  }

  if (firstConfirmedBooking) {
    await ensureNotification({
      title: 'Payment completed',
      message:
        'Payment completed for L. Sirius Business Suite in Prishtina Center.',
      type: 'PAYMENT',
      userId: normalUser.id,
      bookingId: firstConfirmedBooking.id,
      readAt: new Date('2026-07-01T09:00:00.000Z'),
    });
    await ensureNotification({
      title: 'Invoice generated',
      message:
        'Invoice generated for L. Sirius Business Suite in Prishtina Center.',
      type: 'INVOICE',
      userId: normalUser.id,
      bookingId: firstConfirmedBooking.id,
    });
  }

  if (secondConfirmedBooking) {
    await ensureNotification({
      title: 'Invoice generated',
      message: 'Invoice generated for Brezovica Alpine Chalet.',
      type: 'INVOICE',
      userId: normalUser.id,
      bookingId: secondConfirmedBooking.id,
      readAt: new Date('2026-12-01T09:00:00.000Z'),
    });
  }

  if (cancelledBooking) {
    await ensureNotification({
      title: 'Booking cancelled',
      message: 'Booking cancelled for Emerald Garden Family Apartment.',
      type: 'BOOKING',
      userId: normalUser.id,
      bookingId: cancelledBooking.id,
      readAt: new Date('2026-09-01T09:00:00.000Z'),
    });
  }

  if (lSiriusTenant && firstConfirmedBooking) {
    await ensureNotification({
      title: 'New booking received',
      message:
        'A confirmed booking was received for L. Sirius Business Suite in Prishtina Center.',
      type: 'BOOKING',
      tenantId: lSiriusTenant.id,
      bookingId: firstConfirmedBooking.id,
    });
  }

  if (rugovaTenant) {
    await ensureNotification({
      title: 'Property availability updated',
      message: 'Rugova Valley Wooden Cabin has a maintenance block in August.',
      type: 'AVAILABILITY',
      tenantId: rugovaTenant.id,
    });
  }

  if (emeraldTenant) {
    await ensureNotification({
      title: 'Property status updated',
      message:
        'Emerald Garden Family Apartment is active and ready for bookings.',
      type: 'PROPERTY',
      tenantId: emeraldTenant.id,
      readAt: new Date('2026-05-01T09:00:00.000Z'),
    });
  }

  console.log('Seed completed.');
  console.log('SUPER_ADMIN: superadmin@test.com / 12345678');
  console.log('USER: user@test.com / 12345678');
  console.log('TENANT_ADMIN L. Sirius Hotel: admin@lsirius.com / 12345678');
  console.log(
    'TENANT_ADMIN Swiss D. Urban Stays: admin@swissdurban.com / 12345678',
  );
  console.log(
    'TENANT_ADMIN Emerald Garden Villa: admin@emeraldgarden.com / 12345678',
  );
  console.log(
    'TENANT_ADMIN Rugova Alpine Group: admin@rugovaalpine.com / 12345678',
  );
  console.log(
    'TENANT_ADMIN Brezovica Snow Stays: admin@brezovicasnow.com / 12345678',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
