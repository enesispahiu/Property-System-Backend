import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaClient, type Prisma } from '../generated/prisma';
import { AppModule } from '../src/app.module';
import { Roles } from '../src/auth/roles';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
} satisfies Prisma.PrismaClientOptions);

jest.setTimeout(30_000);

describe('Phase 1 core flows (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let superAdminToken: string;
  let userToken: string;
  let tenantAdminToken: string;
  let otherTenantAdminToken: string;
  let otherTenantId: number;
  let otherTenantPropertyId: number;
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

    const [superAdminRole, tenantAdminRole, userRole] = await Promise.all([
      ensureRole(Roles.SUPER_ADMIN),
      ensureRole(Roles.TENANT_ADMIN),
      ensureRole(Roles.USER),
    ]);
    const password = await bcrypt.hash('12345678', 12);

    await prisma.user.upsert({
      where: { email: `phase1-super-${unique}@test.com` },
      update: {
        password,
        roleId: superAdminRole.id,
        tenantId: null,
      },
      create: {
        email: `phase1-super-${unique}@test.com`,
        password,
        roleId: superAdminRole.id,
        tenantId: null,
      },
    });

    const user = await prisma.user.upsert({
      where: { email: `phase1-user-${unique}@test.com` },
      update: {
        password,
        roleId: userRole.id,
        tenantId: null,
      },
      create: {
        email: `phase1-user-${unique}@test.com`,
        password,
        roleId: userRole.id,
        tenantId: null,
      },
    });

    const tenant = await prisma.tenant.upsert({
      where: { slug: `phase1-property-tenant-${unique}` },
      update: {},
      create: {
        name: `Phase 1 Property Tenant ${unique}`,
        slug: `phase1-property-tenant-${unique}`,
        primaryColor: '#ff385c',
      },
    });
    testTenantIds.push(tenant.id);

    await prisma.user.upsert({
      where: { email: `phase1-admin-${unique}@test.com` },
      update: {
        password,
        roleId: tenantAdminRole.id,
        tenantId: tenant.id,
      },
      create: {
        email: `phase1-admin-${unique}@test.com`,
        password,
        roleId: tenantAdminRole.id,
        tenantId: tenant.id,
      },
    });

    const otherTenant = await prisma.tenant.upsert({
      where: { slug: `phase1-other-tenant-${unique}` },
      update: {},
      create: {
        name: `Phase 1 Other Tenant ${unique}`,
        slug: `phase1-other-tenant-${unique}`,
        primaryColor: '#2563eb',
      },
    });
    otherTenantId = otherTenant.id;
    testTenantIds.push(otherTenant.id);

    const otherAdmin = await prisma.user.upsert({
      where: { email: `phase1-other-admin-${unique}@test.com` },
      update: {
        password,
        roleId: tenantAdminRole.id,
        tenantId: otherTenant.id,
      },
      create: {
        email: `phase1-other-admin-${unique}@test.com`,
        password,
        roleId: tenantAdminRole.id,
        tenantId: otherTenant.id,
      },
    });

    const otherProperty = await prisma.property.create({
      data: {
        title: `Other Tenant Property ${unique}`,
        description: 'A property owned by a different tenant.',
        location: 'Prishtina',
        price: 91,
        status: 'ACTIVE',
        tenantId: otherTenant.id,
        ownerId: otherAdmin.id,
      },
    });
    otherTenantPropertyId = otherProperty.id;
    testPropertyIds.push(otherProperty.id);

    await prisma.searchHistory.create({
      data: {
        query: JSON.stringify({ location: `phase1-${unique}` }),
      },
    });

    superAdminToken = await login(`phase1-super-${unique}@test.com`);
    userToken = await login(user.email);
    tenantAdminToken = await login(`phase1-admin-${unique}@test.com`);
    otherTenantAdminToken = await login(otherAdmin.email);
  });

  afterAll(async () => {
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
        const isExpectedTestTenant =
          tenant.slug === `phase1-property-tenant-${unique}` ||
          tenant.slug === `phase1-other-tenant-${unique}`;
        if (!isExpectedTestTenant) {
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

  it('allows a tenant admin to create, fetch, update, and deactivate their property', async () => {
    const propertyLocation = `Prishtina Phase 1 CRUD ${unique}`;

    const createResponse = await request(server)
      .post('/properties')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send({
        title: `Phase 1 CRUD Apartment ${unique}`,
        description: 'A focused e2e property for tenant admin CRUD coverage.',
        location: propertyLocation,
        price: 77,
        status: 'ACTIVE',
      })
      .expect(201);

    const propertyId = createResponse.body.id as number;
    testPropertyIds.push(propertyId);
    expect(createResponse.body.title).toBe(`Phase 1 CRUD Apartment ${unique}`);

    const amenity = await prisma.amenity.create({
      data: {
        name: `Phase 1 Amenity ${unique}`,
      },
    });

    const propertyAmenity = await prisma.propertyAmenity.create({
      data: {
        propertyId,
        amenityId: amenity.id,
      },
    });

    const fetchResponse = await request(server)
      .get(`/properties/${propertyId}`)
      .expect(200);
    expect(fetchResponse.body.id).toBe(propertyId);

    const searchBeforeDelete = await request(server)
      .get('/search/properties')
      .query({ location: propertyLocation })
      .expect(200);
    expect(
      searchBeforeDelete.body.data.some(
        (property: { id: number }) => property.id === propertyId,
      ),
    ).toBe(true);

    const updateResponse = await request(server)
      .patch(`/properties/${propertyId}`)
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send({
        title: `Phase 1 Updated Apartment ${unique}`,
        price: 88,
      })
      .expect(200);
    expect(updateResponse.body.title).toBe(
      `Phase 1 Updated Apartment ${unique}`,
    );
    expect(updateResponse.body.price).toBe(88);

    const deleteResponse = await request(server)
      .delete(`/properties/${propertyId}`)
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .expect(200);
    expect(deleteResponse.body.id).toBe(propertyId);
    expect(deleteResponse.body.status).toBe('INACTIVE');

    await request(server).get(`/properties/${propertyId}`).expect(404);

    const adminFetchResponse = await request(server)
      .get(`/properties/${propertyId}`)
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .expect(200);
    expect(adminFetchResponse.body.status).toBe('INACTIVE');

    const searchAfterDelete = await request(server)
      .get('/search/properties')
      .query({ location: propertyLocation })
      .expect(200);
    expect(
      searchAfterDelete.body.data.some(
        (property: { id: number }) => property.id === propertyId,
      ),
    ).toBe(false);

    await expect(
      prisma.propertyAmenity.findUnique({ where: { id: propertyAmenity.id } }),
    ).resolves.toMatchObject({
      id: propertyAmenity.id,
      propertyId,
      amenityId: amenity.id,
    });
  });

  it('prevents a tenant admin from modifying another tenant property', async () => {
    await request(server)
      .patch(`/properties/${otherTenantPropertyId}`)
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send({ price: 101 })
      .expect(404);

    await request(server)
      .delete(`/properties/${otherTenantPropertyId}`)
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .expect(404);
  });

  it('prevents a normal user from deactivating a property', async () => {
    await request(server)
      .delete(`/properties/${otherTenantPropertyId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('scopes admin property listing by tenant and keeps public search cross-tenant', async () => {
    const tenantPropertyResponse = await request(server)
      .post('/properties')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .send({
        title: `Tenant A Scoped Listing ${unique}`,
        description: 'A property visible to tenant A admin only in management.',
        location: `Shared Public Location ${unique}`,
        price: 111,
        status: 'ACTIVE',
      })
      .expect(201);
    const tenantPropertyId = tenantPropertyResponse.body.id as number;
    testPropertyIds.push(tenantPropertyId);

    const tenantAList = await request(server)
      .get('/properties')
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .expect(200);
    expect(
      tenantAList.body.every(
        (property: { tenantId: number }) =>
          property.tenantId === tenantPropertyResponse.body.tenantId,
      ),
    ).toBe(true);
    expect(
      tenantAList.body.some(
        (property: { id: number }) => property.id === tenantPropertyId,
      ),
    ).toBe(true);
    expect(
      tenantAList.body.some(
        (property: { id: number }) => property.id === otherTenantPropertyId,
      ),
    ).toBe(false);

    const tenantBList = await request(server)
      .get('/properties')
      .set('Authorization', `Bearer ${otherTenantAdminToken}`)
      .expect(200);
    expect(
      tenantBList.body.every(
        (property: { tenantId: number }) =>
          property.tenantId !== tenantPropertyResponse.body.tenantId,
      ),
    ).toBe(true);
    expect(
      tenantBList.body.some(
        (property: { id: number }) => property.id === otherTenantPropertyId,
      ),
    ).toBe(true);

    const superAdminList = await request(server)
      .get('/properties')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(
      superAdminList.body.some(
        (property: { id: number }) => property.id === tenantPropertyId,
      ),
    ).toBe(true);
    expect(
      superAdminList.body.some(
        (property: { id: number }) => property.id === otherTenantPropertyId,
      ),
    ).toBe(true);

    const superAdminUpdate = await request(server)
      .patch(`/properties/${otherTenantPropertyId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ price: 92 })
      .expect(200);
    expect(superAdminUpdate.body.price).toBe(92);

    await request(server)
      .get('/properties')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const publicSearch = await request(server)
      .get('/search/properties')
      .query({ location: 'Prishtina', limit: 100 })
      .expect(200);
    expect(
      publicSearch.body.data.some(
        (property: { id: number }) => property.id === otherTenantPropertyId,
      ),
    ).toBe(true);
    expect(
      publicSearch.body.data.every(
        (property: { status: string }) => property.status === 'ACTIVE',
      ),
    ).toBe(true);
  });

  it('hides active properties from inactive tenants and restores them after reactivation', async () => {
    await request(server)
      .patch(`/platform/tenants/${otherTenantId}/deactivate`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('INACTIVE');
      });

    const inactiveTenantSearch = await request(server)
      .get('/search/properties')
      .query({ location: 'Prishtina', limit: 100 })
      .expect(200);
    expect(
      inactiveTenantSearch.body.data.some(
        (property: { id: number }) => property.id === otherTenantPropertyId,
      ),
    ).toBe(false);

    await request(server)
      .patch(`/platform/tenants/${otherTenantId}/reactivate`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ACTIVE');
      });

    const activeTenantSearch = await request(server)
      .get('/search/properties')
      .query({ location: 'Prishtina', limit: 100 })
      .expect(200);
    expect(
      activeTenantSearch.body.data.some(
        (property: { id: number }) => property.id === otherTenantPropertyId,
      ),
    ).toBe(true);
  });

  it('blocks non-superadmins from tenant deactivate, reactivate, and delete', async () => {
    await request(server)
      .patch(`/platform/tenants/${otherTenantId}/deactivate`)
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .expect(403);

    await request(server)
      .patch(`/platform/tenants/${otherTenantId}/reactivate`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    await request(server)
      .delete(`/platform/tenants/${otherTenantId}`)
      .set('Authorization', `Bearer ${tenantAdminToken}`)
      .expect(403);
  });

  it('prevents permanent tenant delete when related data exists', async () => {
    await request(server)
      .delete(`/platform/tenants/${otherTenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Tenant cannot be permanently deleted because it has related data. Deactivate/archive is recommended.',
        );
      });
  });

  it('allows a superadmin to create, list, update, and delete an empty tenant', async () => {
    const createResponse = await request(server)
      .post('/platform/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: `Phase 1 Empty Tenant ${unique}`,
        slug: `phase1-empty-tenant-${unique}`,
        primaryColor: '#0ea5a4',
      })
      .expect(201);

    const tenantId = createResponse.body.id as number;

    const listResponse = await request(server)
      .get('/platform/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(
      listResponse.body.some(
        (tenant: { id: number }) => tenant.id === tenantId,
      ),
    ).toBe(true);

    await request(server)
      .patch(`/platform/tenants/${tenantId}/deactivate`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    const activeOnlyResponse = await request(server)
      .get('/platform/tenants')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(
      activeOnlyResponse.body.some(
        (tenant: { id: number }) => tenant.id === tenantId,
      ),
    ).toBe(false);

    const includeInactiveResponse = await request(server)
      .get('/platform/tenants')
      .query({ includeInactive: 'true' })
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    expect(
      includeInactiveResponse.body.some(
        (tenant: { id: number }) => tenant.id === tenantId,
      ),
    ).toBe(true);

    await request(server)
      .patch(`/platform/tenants/${tenantId}/reactivate`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    const updateResponse = await request(server)
      .patch(`/platform/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: `Phase 1 Empty Tenant Updated ${unique}`,
      })
      .expect(200);
    expect(updateResponse.body.name).toBe(
      `Phase 1 Empty Tenant Updated ${unique}`,
    );

    await request(server)
      .delete(`/platform/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    await request(server)
      .get(`/platform/tenants/${tenantId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(404);
  });

  it('protects search history for superadmins only', async () => {
    await request(server).get('/search/history').expect(401);

    await request(server)
      .get('/search/history')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const response = await request(server)
      .get('/search/history')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
