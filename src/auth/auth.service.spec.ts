import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'JWT_REFRESH_SECRET' ? 'test-refresh-secret' : 'test-access-secret',
            ),
          },
        },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  it('registers a user, hashes password, and stores a refresh token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.tenant.create.mockResolvedValue({ id: 10, name: 'Acme' });
    prisma.role.findUnique.mockResolvedValue({ id: 2, name: 'USER' });
    prisma.user.create.mockResolvedValue({
      id: 1,
      email: 'new@example.com',
      password: 'hashed',
      tenantId: 10,
      role: { name: 'USER' },
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.register({
      email: 'new@example.com',
      password: 'StrongPassword123!',
      tenantName: 'Acme',
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.user).toEqual({
      id: 1,
      email: 'new@example.com',
      role: 'USER',
      tenantId: 10,
    });
    expect(prisma.user.create.mock.calls[0][0].data.password).not.toBe(
      'StrongPassword123!',
    );
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        token: result.refreshToken,
        userId: 1,
        expiresAt: expect.any(Date),
      }),
    });
  });

  it('logs in with valid credentials and signs access and refresh JWTs', async () => {
    const password = await bcrypt.hash('StrongPassword123!', 12);
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password,
      tenantId: 3,
      role: { name: 'TENANT_ADMIN' },
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.login({
      email: 'user@example.com',
      password: 'StrongPassword123!',
    });

    const accessPayload = await jwtService.verifyAsync(result.accessToken, {
      secret: 'test-access-secret',
    });
    const refreshPayload = await jwtService.verifyAsync(result.refreshToken, {
      secret: 'test-refresh-secret',
    });

    expect(accessPayload).toMatchObject({ sub: 1, role: 'TENANT_ADMIN', tenantId: 3 });
    expect(refreshPayload).toMatchObject({ sub: 1, role: 'TENANT_ADMIN', tenantId: 3 });
  });

  it('rotates a valid refresh token', async () => {
    const refreshToken = await jwtService.signAsync(
      { sub: 1, email: 'user@example.com', role: 'USER', tenantId: 3 },
      { secret: 'test-refresh-secret', expiresIn: '7d' },
    );
    prisma.refreshToken.findUnique.mockResolvedValue({
      token: refreshToken,
      userId: 1,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
      password: 'hashed',
      tenantId: 3,
      role: { name: 'USER' },
    });
    prisma.refreshToken.delete.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.refresh({ refreshToken });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
      where: { token: refreshToken },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });
});
