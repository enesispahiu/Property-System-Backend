import { NotificationsService } from './notifications.service';
import { Roles } from '../auth/roles';

describe('NotificationsService', () => {
  const prisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma as any);
  });

  it('scopes tenant admins to their own user notifications and tenant broadcasts', async () => {
    prisma.notification.findMany.mockResolvedValue([]);

    await service.findMine({
      sub: 10,
      email: 'admin@test.com',
      roleId: 2,
      role: Roles.TENANT_ADMIN,
      tenantId: 99,
    });

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ userId: 10 }, { userId: null, tenantId: 99 }],
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('does not expose tenant-wide admin notifications to customers', async () => {
    prisma.notification.findMany.mockResolvedValue([]);

    await service.findMine({
      sub: 30,
      email: 'guest@test.com',
      roleId: 3,
      role: Roles.USER,
      tenantId: 99,
    });

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 30 },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('creates one notification per tenant admin', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.notification.create.mockResolvedValue({});

    await service.notifyTenantAdmins(50, {
      title: 'Property updated',
      message: 'Property Beach Apartment was updated.',
      type: 'PROPERTY_UPDATED',
    });

    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        title: 'Property updated',
        message: 'Property Beach Apartment was updated.',
        type: 'PROPERTY_UPDATED',
        userId: 1,
        tenantId: 50,
        bookingId: null,
      },
    });
  });
});
