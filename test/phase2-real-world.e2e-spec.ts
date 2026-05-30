import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaClient, type Prisma } from '../generated/prisma';
import { AppModule } from '../src/app.module';
import { Roles } from '../src/auth/roles';
import { SearchService } from '../src/search/search.service';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
} satisfies Prisma.PrismaClientOptions);

jest.setTimeout(30_000);

describe('Phase 2 real-world features (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let userToken: string;
  let otherUserToken: string;
  let userId: number;
  let otherUserId: number;
  let activePropertyId: number;
  let inactivePropertyId: number;
  let tenantId: number;
  let pendingBookingId: number;
  let otherUserBookingId: number;
  let searchService: SearchService;
  const testPropertyIds: number[] = [];
  const testTenantIds: number[] = [];

  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  async function ensureRole(name: string) {
    return prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  async function login(email: string, password = '12345678') {
    const response = await request(server)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.accessToken as string;
  }

  async function cleanupE2eNotifications(runSuffix: string) {
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { title: { contains: runSuffix } },
          { message: { contains: runSuffix } },
        ],
      },
    });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer();
    searchService = app.get(SearchService);

    const [tenantAdminRole, userRole] = await Promise.all([
      ensureRole(Roles.TENANT_ADMIN),
      ensureRole(Roles.USER),
    ]);
    const password = await bcrypt.hash('12345678', 12);

    const tenant = await prisma.tenant.create({
      data: {
        name: `Phase 2 Tenant ${unique}`,
        slug: `phase2-tenant-${unique}`,
        primaryColor: '#2563eb',
      },
    });
    tenantId = tenant.id;
    testTenantIds.push(tenant.id);

    const owner = await prisma.user.create({
      data: {
        email: `phase2-owner-${unique}@test.com`,
        password,
        roleId: tenantAdminRole.id,
        tenantId: tenant.id,
      },
    });

    const [user, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          email: `phase2-user-${unique}@test.com`,
          password,
          roleId: userRole.id,
          tenantId: null,
        },
      }),
      prisma.user.create({
        data: {
          email: `phase2-other-user-${unique}@test.com`,
          password,
          roleId: userRole.id,
          tenantId: null,
        },
      }),
    ]);
    userId = user.id;
    otherUserId = otherUser.id;

    const [activeProperty, inactiveProperty] = await Promise.all([
      prisma.property.create({
        data: {
          title: `Phase 2 Active Property ${unique}`,
          description: 'A property for favorites and payment coverage.',
          location: 'Prishtina',
          price: 125,
          status: 'ACTIVE',
          tenantId: tenant.id,
          ownerId: owner.id,
        },
      }),
      prisma.property.create({
        data: {
          title: `Phase 2 Inactive Property ${unique}`,
          description: 'An inactive property for favorites rejection coverage.',
          location: 'Prishtina',
          price: 99,
          status: 'INACTIVE',
          tenantId: tenant.id,
          ownerId: owner.id,
        },
      }),
    ]);
    activePropertyId = activeProperty.id;
    inactivePropertyId = inactiveProperty.id;
    testPropertyIds.push(activeProperty.id, inactiveProperty.id);

    const [pendingBooking, otherUserBooking] = await Promise.all([
      prisma.booking.create({
        data: {
          startDate: new Date('2035-01-01T00:00:00.000Z'),
          endDate: new Date('2035-01-04T00:00:00.000Z'),
          status: 'PENDING',
          totalPrice: 375,
          userId,
          propertyId: activePropertyId,
          tenantId: tenant.id,
        },
      }),
      prisma.booking.create({
        data: {
          startDate: new Date('2035-02-01T00:00:00.000Z'),
          endDate: new Date('2035-02-03T00:00:00.000Z'),
          status: 'PENDING',
          totalPrice: 250,
          userId: otherUserId,
          propertyId: activePropertyId,
          tenantId: tenant.id,
        },
      }),
    ]);
    pendingBookingId = pendingBooking.id;
    otherUserBookingId = otherUserBooking.id;

    userToken = await login(user.email);
    otherUserToken = await login(otherUser.email);
  });

  afterAll(async () => {
    await cleanupE2eNotifications(unique);

    if (testPropertyIds.length > 0) {
      await prisma.property.updateMany({
        where: { id: { in: testPropertyIds } },
        data: { status: 'INACTIVE' },
      });
    }
    if (testTenantIds.length > 0) {
      await prisma.property.updateMany({
        where: { tenantId: { in: testTenantIds } },
        data: { status: 'INACTIVE' },
      });

      const testTenants = await prisma.tenant.findMany({
        where: { id: { in: testTenantIds } },
        select: {
          id: true,
          slug: true,
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

      for (const tenant of testTenants) {
        if (tenant.slug !== `phase2-tenant-${unique}`) {
          continue;
        }

        const hasRelatedData = Object.values(tenant._count).some(
          (count) => count > 0,
        );
        if (hasRelatedData) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { status: 'INACTIVE' },
          });
        } else {
          await prisma.tenant.delete({ where: { id: tenant.id } });
        }
      }

      await expect(
        prisma.tenant.count({
          where: { id: { in: testTenantIds }, status: 'ACTIVE' },
        }),
      ).resolves.toBe(0);
      await expect(
        prisma.property.count({
          where: { tenantId: { in: testTenantIds }, status: 'ACTIVE' },
        }),
      ).resolves.toBe(0);
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('allows a user to add, list, and remove their own favorite', async () => {
    const addResponse = await request(server)
      .post(`/favorites/${activePropertyId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(201);
    expect(addResponse.body.favorite.property.id).toBe(activePropertyId);

    const listResponse = await request(server)
      .get('/favorites/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(
      listResponse.body.some(
        (favorite: { property: { id: number } }) =>
          favorite.property.id === activePropertyId,
      ),
    ).toBe(true);

    await request(server)
      .delete(`/favorites/${activePropertyId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const afterRemoveResponse = await request(server)
      .get('/favorites/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(
      afterRemoveResponse.body.some(
        (favorite: { property: { id: number } }) =>
          favorite.property.id === activePropertyId,
      ),
    ).toBe(false);
  });

  it('does not create duplicate favorite rows', async () => {
    await request(server)
      .post(`/favorites/${activePropertyId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(201);

    await request(server)
      .post(`/favorites/${activePropertyId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(201);

    await expect(
      prisma.favoriteProperty.count({
        where: {
          userId,
          propertyId: activePropertyId,
        },
      }),
    ).resolves.toBe(1);
  });

  it('rejects inactive, inactive-tenant, missing, and unauthenticated favorite requests', async () => {
    await request(server)
      .post(`/favorites/${inactivePropertyId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'INACTIVE' },
    });

    await request(server)
      .post(`/favorites/${activePropertyId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);

    const inactiveTenantFavoritesResponse = await request(server)
      .get('/favorites/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(
      inactiveTenantFavoritesResponse.body.some(
        (favorite: { property: { id: number } }) =>
          favorite.property.id === activePropertyId,
      ),
    ).toBe(false);

    await request(server)
      .delete(`/favorites/${activePropertyId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'ACTIVE' },
    });

    await request(server)
      .post('/favorites/999999999')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);

    await request(server).post(`/favorites/${activePropertyId}`).expect(401);

    await request(server).get('/favorites/me').expect(401);
  });

  it('keeps public search limited to active properties from active tenants', async () => {
    const activeSearchResponse = await request(server)
      .get('/search/properties')
      .query({ location: 'Prishtina', limit: 100 })
      .expect(200);

    expect(
      activeSearchResponse.body.data.some(
        (property: { id: number }) => property.id === activePropertyId,
      ),
    ).toBe(true);
    expect(
      activeSearchResponse.body.data.some(
        (property: { id: number }) => property.id === inactivePropertyId,
      ),
    ).toBe(false);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'INACTIVE' },
    });
    await searchService.clearCache();

    const inactiveTenantSearchResponse = await request(server)
      .get('/search/properties')
      .query({
        location: 'Prishtina',
        limit: 100,
        cacheBust: 'inactive-tenant',
      })
      .expect(200);

    expect(
      inactiveTenantSearchResponse.body.data.some(
        (property: { id: number }) => property.id === activePropertyId,
      ),
    ).toBe(false);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'ACTIVE' },
    });
    await searchService.clearCache();
  });

  it('allows a user to pay their own pending booking', async () => {
    const payResponse = await request(server)
      .post(`/payments/bookings/${pendingBookingId}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ method: 'CARD' })
      .expect(201);

    expect(payResponse.body.payment.status).toBe('PAID');
    expect(payResponse.body.payment.method).toBe('CARD');
    expect(payResponse.body.payment.amount).toBe(375);
    expect(payResponse.body.booking.status).toBe('CONFIRMED');

    await expect(
      prisma.booking.findUnique({
        where: { id: pendingBookingId },
        include: { payments: true },
      }),
    ).resolves.toMatchObject({
      status: 'CONFIRMED',
      payments: [expect.objectContaining({ status: 'PAID', method: 'CARD' })],
    });
  });

  it('rejects invalid, cross-user, and unauthenticated payment requests', async () => {
    await request(server)
      .post(`/payments/bookings/${otherUserBookingId}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ method: 'CARD' })
      .expect(403);

    await request(server)
      .post(`/payments/bookings/${otherUserBookingId}/pay`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ method: 'CRYPTO' })
      .expect(400);

    await request(server)
      .post(`/payments/bookings/${otherUserBookingId}/pay`)
      .send({ method: 'CARD' })
      .expect(401);
  });

  it('handles duplicate payment cleanly', async () => {
    const duplicateResponse = await request(server)
      .post(`/payments/bookings/${pendingBookingId}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ method: 'CARD' })
      .expect(201);

    expect(duplicateResponse.body.message).toBe('Booking is already paid');

    await expect(
      prisma.payment.count({
        where: {
          bookingId: pendingBookingId,
          status: 'PAID',
        },
      }),
    ).resolves.toBe(1);
  });
});
