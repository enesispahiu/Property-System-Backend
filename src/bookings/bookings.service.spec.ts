import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: {
    booking: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      booking: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: prisma,
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
});
