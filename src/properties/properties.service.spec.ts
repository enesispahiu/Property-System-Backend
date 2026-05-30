import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { Roles } from '../auth/roles';
import { NotificationsService } from '../notifications/notifications.service';

describe('PropertiesService', () => {
  let service: PropertiesService;
  const prisma = {
    property: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const searchService = {
    clearCache: jest.fn(),
  };
  const notificationsService = {
    notifyTenantAdmins: jest.fn(),
    notifySuperAdmins: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    notificationsService.notifyTenantAdmins.mockResolvedValue(undefined);
    notificationsService.notifySuperAdmins.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: SearchService,
          useValue: searchService,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('soft deletes a tenant property by setting it inactive', async () => {
    prisma.property.findFirst.mockResolvedValue({
      id: 1,
      tenantId: 10,
    });
    prisma.property.update.mockResolvedValue({
      id: 1,
      tenantId: 10,
      title: 'Beach Apartment',
      status: 'INACTIVE',
    });

    await expect(
      service.remove(1, {
        sub: 20,
        email: 'admin@test.com',
        roleId: 2,
        role: Roles.TENANT_ADMIN,
        tenantId: 10,
      }),
    ).resolves.toMatchObject({
      id: 1,
      status: 'INACTIVE',
    });

    expect(prisma.property.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'INACTIVE' },
      include: expect.any(Object),
    });
    expect(searchService.clearCache).toHaveBeenCalledTimes(1);
    expect(notificationsService.notifyTenantAdmins).toHaveBeenCalledWith(10, {
      title: 'Property deactivated',
      message: 'Property Beach Apartment was removed from public listings.',
      type: 'PROPERTY_DEACTIVATED',
    });
  });

  it('reactivates a tenant property by setting it active', async () => {
    prisma.property.findFirst.mockResolvedValue({
      id: 1,
      tenantId: 10,
      status: 'INACTIVE',
    });
    prisma.property.update.mockResolvedValue({
      id: 1,
      tenantId: 10,
      title: 'Beach Apartment',
      status: 'ACTIVE',
    });

    await expect(
      service.reactivate(1, {
        sub: 20,
        email: 'admin@test.com',
        roleId: 2,
        role: Roles.TENANT_ADMIN,
        tenantId: 10,
      }),
    ).resolves.toMatchObject({
      id: 1,
      status: 'ACTIVE',
    });

    expect(prisma.property.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'ACTIVE' },
      include: expect.any(Object),
    });
    expect(searchService.clearCache).toHaveBeenCalledTimes(1);
    expect(notificationsService.notifyTenantAdmins).toHaveBeenCalledWith(10, {
      title: 'Property reactivated',
      message: 'Property Beach Apartment was reactivated.',
      type: 'PROPERTY_REACTIVATED',
    });
  });

  it('does not allow tenant admin to reactivate another tenant property', async () => {
    prisma.property.findFirst.mockResolvedValue(null);

    await expect(
      service.reactivate(2, {
        sub: 20,
        email: 'admin@test.com',
        roleId: 2,
        role: Roles.TENANT_ADMIN,
        tenantId: 10,
      }),
    ).rejects.toThrow('Property with id 2 not found');

    expect(prisma.property.update).not.toHaveBeenCalled();
    expect(searchService.clearCache).not.toHaveBeenCalled();
  });

  it('allows superadmin to reactivate any property', async () => {
    prisma.property.findUnique.mockResolvedValue({
      id: 3,
      tenantId: 99,
      status: 'INACTIVE',
    });
    prisma.property.update.mockResolvedValue({
      id: 3,
      tenantId: 99,
      title: 'Platform Property',
      status: 'ACTIVE',
    });

    await expect(
      service.reactivate(3, {
        sub: 1,
        email: 'super@test.com',
        roleId: 1,
        role: Roles.SUPER_ADMIN,
      }),
    ).resolves.toMatchObject({
      id: 3,
      status: 'ACTIVE',
    });
    expect(notificationsService.notifySuperAdmins).toHaveBeenCalledWith({
      title: 'Property reactivated',
      message: 'Property Platform Property was reactivated.',
      type: 'PROPERTY_REACTIVATED',
    });
  });

  it('does not allow normal users to reactivate properties', async () => {
    await expect(
      service.reactivate(1, {
        sub: 30,
        email: 'user@test.com',
        roleId: 3,
        role: Roles.USER,
      }),
    ).rejects.toThrow('Tenant information is required');

    expect(prisma.property.update).not.toHaveBeenCalled();
  });
});
