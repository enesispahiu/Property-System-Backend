import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  const prisma = {
    tenant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };
  const searchService = {
    clearCache: jest.fn(),
  };
  const notificationsService = {
    notifySuperAdmins: jest.fn(),
    notifyTenantAdmins: jest.fn(),
  };

  let service: PlatformService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findMany.mockResolvedValue([]);
    notificationsService.notifySuperAdmins.mockResolvedValue(undefined);
    notificationsService.notifyTenantAdmins.mockResolvedValue(undefined);
    service = new PlatformService(
      prisma as any,
      searchService as any,
      notificationsService as any,
    );
  });

  it('lists active tenants by default', async () => {
    prisma.tenant.findMany.mockResolvedValue([{ id: 1, status: 'ACTIVE' }]);

    await expect(service.findTenants()).resolves.toEqual([
      { id: 1, status: 'ACTIVE' },
    ]);

    expect(prisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
      }),
    );
  });

  it('can include inactive tenants explicitly', async () => {
    prisma.tenant.findMany.mockResolvedValue([
      { id: 1, status: 'ACTIVE' },
      { id: 2, status: 'INACTIVE' },
    ]);

    await expect(
      service.findTenants({ includeInactive: true }),
    ).resolves.toHaveLength(2);

    expect(prisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: undefined,
      }),
    );
  });

  it('deletes an empty tenant', async () => {
    prisma.tenant.findUnique
      .mockResolvedValueOnce({ id: 10, name: 'Empty Tenant' })
      .mockResolvedValueOnce({
        _count: {
          users: 0,
          properties: 0,
          bookings: 0,
          reviews: 0,
          notifications: 0,
        },
      });
    prisma.tenant.delete.mockResolvedValue({ id: 10, name: 'Empty Tenant' });

    await expect(service.deleteTenant(10)).resolves.toMatchObject({ id: 10 });

    expect(prisma.tenant.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(notificationsService.notifySuperAdmins).toHaveBeenCalledWith({
      title: 'Tenant deleted',
      message: 'Tenant Empty Tenant was permanently deleted.',
      type: 'PLATFORM_TENANT_DELETED',
    });
  });

  it('rejects permanent delete when tenant has related data', async () => {
    prisma.tenant.findUnique
      .mockResolvedValueOnce({ id: 11, name: 'Busy Tenant' })
      .mockResolvedValueOnce({
        _count: {
          users: 1,
          properties: 0,
          bookings: 0,
          reviews: 0,
          notifications: 0,
        },
      });

    await expect(service.deleteTenant(11)).rejects.toThrow(
      'Tenant cannot be permanently deleted because it has related data. Deactivate/archive is recommended.',
    );
    expect(prisma.tenant.delete).not.toHaveBeenCalled();
    expect(notificationsService.notifySuperAdmins).toHaveBeenCalledWith({
      title: 'Tenant delete blocked',
      message:
        'Tenant Busy Tenant could not be deleted because it has related data.',
      type: 'PLATFORM_TENANT_DELETE_BLOCKED',
    });
  });

  it('deactivates a tenant and clears public search cache', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: 12, name: 'Tenant' });
    prisma.tenant.update.mockResolvedValue({
      id: 12,
      name: 'Tenant',
      status: 'INACTIVE',
    });

    await expect(service.deactivateTenant(12)).resolves.toMatchObject({
      status: 'INACTIVE',
    });
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { status: 'INACTIVE' },
    });
    expect(searchService.clearCache).toHaveBeenCalled();
    expect(notificationsService.notifySuperAdmins).toHaveBeenCalledWith({
      title: 'Tenant deactivated',
      message: 'Tenant Tenant was deactivated.',
      type: 'PLATFORM_TENANT_DEACTIVATED',
    });
    expect(notificationsService.notifyTenantAdmins).toHaveBeenCalledWith(12, {
      title: 'Tenant deactivated',
      message: 'Tenant Tenant was deactivated.',
      type: 'TENANT_DEACTIVATED',
    });
  });

  it('reactivates a tenant and clears public search cache', async () => {
    prisma.tenant.findUnique.mockResolvedValueOnce({ id: 13, name: 'Tenant' });
    prisma.tenant.update.mockResolvedValue({
      id: 13,
      name: 'Tenant',
      status: 'ACTIVE',
    });

    await expect(service.reactivateTenant(13)).resolves.toMatchObject({
      status: 'ACTIVE',
    });
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 13 },
      data: { status: 'ACTIVE' },
    });
    expect(searchService.clearCache).toHaveBeenCalled();
    expect(notificationsService.notifySuperAdmins).toHaveBeenCalledWith({
      title: 'Tenant reactivated',
      message: 'Tenant Tenant was reactivated.',
      type: 'PLATFORM_TENANT_REACTIVATED',
    });
    expect(notificationsService.notifyTenantAdmins).toHaveBeenCalledWith(13, {
      title: 'Tenant reactivated',
      message: 'Tenant Tenant was reactivated.',
      type: 'TENANT_REACTIVATED',
    });
  });

  it('throws not found for a missing tenant', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);

    await expect(service.deleteTenant(99)).rejects.toThrow(NotFoundException);
    expect(prisma.tenant.delete).not.toHaveBeenCalled();
  });
});
