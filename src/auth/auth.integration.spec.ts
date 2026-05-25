import { Controller, Get, INestApplication, UseGuards, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from './auth.module';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('guard-test')
class GuardTestController {
  @Get('admin')
  @Roles('TENANT_ADMIN')
  @UseGuards(JwtAuthGuard, RolesGuard)
  adminOnly() {
    return { ok: true };
  }
}

describe('Auth endpoints (integration)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
      controllers: [GuardTestController],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = moduleFixture.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('validates register payloads', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'bad', password: 'short' })
      .expect(400);
  });

  it('registers and returns verifiable access and refresh tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.tenant.create.mockResolvedValue({ id: 1, name: 'Acme' });
    prisma.role.findUnique.mockResolvedValue({ id: 1, name: 'USER' });
    prisma.user.create.mockResolvedValue({
      id: 1,
      email: 'tenant@example.com',
      password: 'hashed',
      tenantId: 1,
      role: { name: 'USER' },
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'tenant@example.com',
        password: 'StrongPassword123!',
        tenantName: 'Acme',
      })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));

    await expect(
      jwtService.verifyAsync(response.body.accessToken, {
        secret: 'test-access-secret',
      }),
    ).resolves.toMatchObject({ sub: 1, role: 'USER', tenantId: 1 });
    await expect(
      jwtService.verifyAsync(response.body.refreshToken, {
        secret: 'test-refresh-secret',
      }),
    ).resolves.toMatchObject({ sub: 1, role: 'USER', tenantId: 1 });
  });

  it('returns the current user from a bearer access token', async () => {
    const accessToken = await jwtService.signAsync(
      { sub: 7, email: 'admin@example.com', role: 'TENANT_ADMIN', tenantId: 2 },
      { secret: 'test-access-secret', expiresIn: '15m' },
    );

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({
        id: 7,
        email: 'admin@example.com',
        role: 'TENANT_ADMIN',
        tenantId: 2,
      });
  });

  it('enforces role-based guards', async () => {
    const tenantToken = await jwtService.signAsync(
      { sub: 8, email: 'tenant@example.com', role: 'USER', tenantId: 1 },
      { secret: 'test-access-secret', expiresIn: '15m' },
    );
    const adminToken = await jwtService.signAsync(
      { sub: 9, email: 'admin@example.com', role: 'TENANT_ADMIN', tenantId: 1 },
      { secret: 'test-access-secret', expiresIn: '15m' },
    );

    await request(app.getHttpServer())
      .get('/guard-test/admin')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/guard-test/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect({ ok: true });
  });
});
