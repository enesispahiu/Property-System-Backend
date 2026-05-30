import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: {
    booking: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    property: {
      findUnique: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    availability: {
      findFirst: jest.Mock;
    };
  };
  let notifications: {
    notifyUser: jest.Mock;
    notifyTenantAdmins: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      booking: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      property: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      availability: {
        findFirst: jest.fn(),
      },
    };
    notifications = {
      notifyUser: jest.fn(),
      notifyTenantAdmins: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: NotificationsService,
          useValue: notifications,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUser', () => {
    it('allows a user to fetch their own bookings across property tenants', async () => {
      const bookings = [
        {
          id: 16,
          userId: 25,
          propertyId: 8,
          tenantId: 11,
          property: {
            id: 8,
            title: 'Beach Apartment',
            location: 'Vlora',
            price: 110,
          },
          payments: [],
        },
      ];

      prisma.booking.findMany.mockResolvedValue(bookings);

      await expect(
        service.findByUser(25, {
          sub: 25,
          email: 'h@gmail.com',
          roleId: 1,
          role: 'USER',
          tenantId: 19,
        }),
      ).resolves.toBe(bookings);

      expect(prisma.booking.findMany).toHaveBeenCalledWith({
        where: {
          userId: 25,
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              location: true,
              price: true,
              images: true,
            },
          },
          payments: true,
          guests: true,
          invoice: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('allows tenant admins to fetch bookings for another user in their tenant', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      await expect(
        service.findByUser(25, {
          sub: 1,
          email: 'admin@example.com',
          roleId: 3,
          role: 'TENANT_ADMIN',
          tenantId: 19,
        }),
      ).resolves.toEqual([]);
    });

    it('forbids non-admins from fetching another user bookings', async () => {
      await expect(
        service.findByUser(25, {
          sub: 26,
          email: 'other@example.com',
          roleId: 1,
          role: 'USER',
          tenantId: 19,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.booking.findMany).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const currentUser = {
      sub: 25,
      email: 'guest@example.com',
      roleId: 1,
      role: 'USER',
      tenantId: null,
    };

    beforeEach(() => {
      prisma.property.findUnique.mockResolvedValue({
        id: 8,
        title: 'Beach Apartment',
        tenantId: 11,
        price: 100,
        status: 'ACTIVE',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 25 });
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.availability.findFirst.mockResolvedValue(null);
      notifications.notifyUser.mockResolvedValue({});
      notifications.notifyTenantAdmins.mockResolvedValue(undefined);
    });

    it('rejects booking dates that overlap blocked availability', async () => {
      prisma.availability.findFirst.mockResolvedValue({ id: 3 });

      await expect(
        service.create(
          {
            propertyId: 8,
            startDate: '2026-07-01',
            endDate: '2026-07-03',
            guestCount: 1,
          },
          currentUser,
        ),
      ).rejects.toThrow('Property is unavailable for the selected dates');

      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('creates booking guests when guest details are provided', async () => {
      const createdBooking = {
        id: 44,
        userId: 25,
        tenantId: 11,
        property: { title: 'Beach Apartment' },
      };
      prisma.booking.create.mockResolvedValue(createdBooking);

      await expect(
        service.create(
          {
            propertyId: 8,
            startDate: '2026-07-01',
            endDate: '2026-07-03',
            guestCount: 2,
            guests: [{ fullName: 'Jane Doe', age: 31 }],
          },
          currentUser,
        ),
      ).resolves.toBe(createdBooking);

      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            guestCount: 2,
            guests: {
              create: [
                {
                  firstName: 'Jane',
                  lastName: 'Doe',
                  age: 31,
                },
              ],
            },
          }),
          include: expect.objectContaining({
            guests: true,
          }),
        }),
      );
      expect(notifications.notifyUser).toHaveBeenCalledWith(25, {
        title: 'Booking pending payment',
        message: 'Your booking for Beach Apartment is pending payment.',
        type: 'BOOKING_CREATED',
        tenantId: 11,
        bookingId: 44,
      });
      expect(notifications.notifyTenantAdmins).toHaveBeenCalledWith(11, {
        title: 'New booking received',
        message: 'New booking received for Beach Apartment.',
        type: 'TENANT_BOOKING_CREATED',
        bookingId: 44,
      });
    });
  });
});
