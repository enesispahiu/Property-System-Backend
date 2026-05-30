import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtPayload } from '../auth/jwt-payload.type';
import { Roles } from '../auth/roles';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private requireTenantId(currentUser: JwtPayload) {
    if (!currentUser.tenantId) {
      throw new ForbiddenException('Tenant information is required');
    }

    return currentUser.tenantId;
  }

  private calculateTotalPrice(
    startDate: Date,
    endDate: Date,
    pricePerNight: number,
  ) {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const numberOfNights = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / millisecondsPerDay,
    );

    return numberOfNights * pricePerNight;
  }

  private async verifyTenantBooking(id: number, currentUser: JwtPayload) {
    if (currentUser.role === Roles.SUPER_ADMIN) {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: {
          user: true,
          property: {
            include: {
              images: true,
            },
          },
          payments: true,
          guests: true,
          invoice: true,
        },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with id ${id} not found`);
      }

      return booking;
    }

    if (currentUser.role === Roles.USER) {
      const booking = await this.prisma.booking.findFirst({
        where: {
          id,
          userId: currentUser.sub,
        },
        include: {
          user: true,
          property: {
            include: {
              images: true,
            },
          },
          payments: true,
          guests: true,
          invoice: true,
        },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with id ${id} not found`);
      }

      return booking;
    }

    const tenantId = this.requireTenantId(currentUser);

    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        user: true,
        property: {
          include: {
            images: true,
          },
        },
        payments: true,
        guests: true,
        invoice: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }

    return booking;
  }

  async create(createBookingDto: CreateBookingDto, currentUser: JwtPayload) {
    const startDate = new Date(createBookingDto.startDate);
    const endDate = new Date(createBookingDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const property = await this.prisma.property.findUnique({
      where: { id: createBookingDto.propertyId },
    });

    if (!property) {
      throw new NotFoundException(
        `Property with id ${createBookingDto.propertyId} not found`,
      );
    }

    if (property.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Property with id ${createBookingDto.propertyId} is not active`,
      );
    }

    const bookingUserId = currentUser.sub;

    const bookingUser = await this.prisma.user.findUnique({
      where: { id: bookingUserId },
    });

    if (!bookingUser) {
      throw new ForbiddenException('User not found');
    }

    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        propertyId: createBookingDto.propertyId,
        status: {
          not: 'CANCELLED',
        },
        AND: [
          {
            startDate: {
              lt: endDate,
            },
          },
          {
            endDate: {
              gt: startDate,
            },
          },
        ],
      },
    });

    if (overlappingBooking) {
      throw new BadRequestException(
        'Property is already booked for the selected dates',
      );
    }

    const blockedAvailability = await this.prisma.availability.findFirst({
      where: {
        propertyId: createBookingDto.propertyId,
        startDate: {
          lt: endDate,
        },
        endDate: {
          gt: startDate,
        },
      },
    });

    if (blockedAvailability) {
      throw new BadRequestException(
        'Property is unavailable for the selected dates',
      );
    }

    const totalPrice = this.calculateTotalPrice(
      startDate,
      endDate,
      property.price,
    );
    const guests = createBookingDto.guests ?? [];
    const guestCount =
      createBookingDto.guestCount ?? Math.max(guests.length, 1);
    const guestData = guests.map((guest) => {
      const normalizedName = guest.fullName.trim();
      const [firstName, ...rest] = normalizedName.split(/\s+/);

      if (!firstName) {
        throw new BadRequestException('Guest full name is required');
      }

      return {
        firstName,
        lastName: rest.join(' ') || '-',
        age: guest.age,
      };
    });

    const booking = await this.prisma.booking.create({
      data: {
        startDate,
        endDate,
        status: 'PENDING',
        totalPrice,
        guestCount,
        userId: bookingUserId,
        propertyId: createBookingDto.propertyId,
        tenantId: property.tenantId,
        guests: guestData.length
          ? {
              create: guestData,
            }
          : undefined,
      },
      include: {
        user: true,
        property: {
          include: {
            images: true,
          },
        },
        payments: true,
        guests: true,
        invoice: true,
      },
    });

    await this.notificationsService.notifyUser(booking.userId, {
      title: 'Booking pending payment',
      message: `Your booking for ${property.title} is pending payment.`,
      type: 'BOOKING_CREATED',
      tenantId: booking.tenantId,
      bookingId: booking.id,
    });
    await this.notificationsService.notifyTenantAdmins(booking.tenantId, {
      title: 'New booking received',
      message: `New booking received for ${property.title}.`,
      type: 'TENANT_BOOKING_CREATED',
      bookingId: booking.id,
    });

    return booking;
  }

  findAll(currentUser: JwtPayload) {
    if (currentUser.role === Roles.SUPER_ADMIN) {
      return this.prisma.booking.findMany({
        include: {
          user: true,
          property: {
            include: {
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
    }

    if (currentUser.role === Roles.TENANT_ADMIN) {
      const tenantId = this.requireTenantId(currentUser);

      return this.prisma.booking.findMany({
        where: {
          tenantId,
        },
        include: {
          user: true,
          property: {
            include: {
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
    }

    return this.prisma.booking.findMany({
      where: {
        userId: currentUser.sub,
      },
      include: {
        user: true,
        property: {
          include: {
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
  }

  async findOne(id: number, currentUser: JwtPayload) {
    return this.verifyTenantBooking(id, currentUser);
  }

  async findByUser(userId: number, currentUser: JwtPayload) {
    if (currentUser.role === Roles.USER && userId !== currentUser.sub) {
      throw new ForbiddenException('You cannot access bookings for this user');
    }

    const tenantId =
      currentUser.role === Roles.TENANT_ADMIN
        ? this.requireTenantId(currentUser)
        : undefined;

    return this.prisma.booking.findMany({
      where: {
        userId,
        ...(tenantId ? { tenantId } : {}),
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
  }

  async update(
    id: number,
    updateBookingDto: UpdateBookingDto,
    currentUser: JwtPayload,
  ) {
    const existingBooking = await this.verifyTenantBooking(id, currentUser);

    if (
      currentUser.role === Roles.USER &&
      existingBooking.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('You cannot update this booking');
    }

    const startDate = updateBookingDto.startDate
      ? new Date(updateBookingDto.startDate)
      : existingBooking.startDate;

    const endDate = updateBookingDto.endDate
      ? new Date(updateBookingDto.endDate)
      : existingBooking.endDate;

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const propertyId =
      updateBookingDto.propertyId ?? existingBooking.propertyId;

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (
      !property ||
      property.status !== 'ACTIVE' ||
      (currentUser.role === Roles.TENANT_ADMIN &&
        property.tenantId !== currentUser.tenantId)
    ) {
      throw new NotFoundException(`Property with id ${propertyId} not found`);
    }

    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        id: {
          not: id,
        },
        propertyId,
        tenantId: property.tenantId,
        status: {
          not: 'CANCELLED',
        },
        startDate: {
          lt: endDate,
        },
        endDate: {
          gt: startDate,
        },
      },
    });

    if (overlappingBooking) {
      throw new BadRequestException(
        'Property is already booked for the selected dates',
      );
    }

    const blockedAvailability = await this.prisma.availability.findFirst({
      where: {
        propertyId,
        startDate: {
          lt: endDate,
        },
        endDate: {
          gt: startDate,
        },
      },
    });

    if (blockedAvailability) {
      throw new BadRequestException(
        'Property is unavailable for the selected dates',
      );
    }

    const bookingUserId =
      currentUser.role !== Roles.USER
        ? (updateBookingDto.userId ?? existingBooking.userId)
        : existingBooking.userId;

    if (bookingUserId !== existingBooking.userId) {
      const bookingUser = await this.prisma.user.findUnique({
        where: { id: bookingUserId },
      });

      if (!bookingUser) {
        throw new ForbiddenException('User must belong to the current tenant');
      }

      if (
        currentUser.role === Roles.TENANT_ADMIN &&
        bookingUser.tenantId !== currentUser.tenantId
      ) {
        throw new ForbiddenException('User must belong to the current tenant');
      }
    }

    const totalPrice = this.calculateTotalPrice(
      startDate,
      endDate,
      property.price,
    );

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: updateBookingDto.status,
        userId: bookingUserId,
        propertyId: propertyId,
        tenantId: property.tenantId,
        startDate,
        endDate,
        totalPrice,
      },
      include: {
        user: true,
        property: {
          include: {
            images: true,
          },
        },
        payments: true,
        guests: true,
        invoice: true,
      },
    });
  }

  async cancel(id: number, currentUser: JwtPayload) {
    const booking = await this.verifyTenantBooking(id, currentUser);

    if (currentUser.role === Roles.USER && booking.userId !== currentUser.sub) {
      throw new ForbiddenException('You cannot cancel this booking');
    }

    const cancelledBooking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    await this.notificationsService.notifyUser(cancelledBooking.userId, {
      title: 'Booking cancelled',
      message: `Booking cancelled for ${booking.property.title}.`,
      type: 'BOOKING_CANCELLED',
      tenantId: cancelledBooking.tenantId,
      bookingId: cancelledBooking.id,
    });
    await this.notificationsService.notifyTenantAdmins(
      cancelledBooking.tenantId,
      {
        title: 'Booking cancelled',
        message: `Booking cancelled for ${booking.property.title}.`,
        type: 'TENANT_BOOKING_CANCELLED',
        bookingId: cancelledBooking.id,
      },
    );

    return cancelledBooking;
  }

  async confirm(id: number, currentUser: JwtPayload) {
    const booking = await this.verifyTenantBooking(id, currentUser);

    if (currentUser.role === Roles.USER && booking.userId !== currentUser.sub) {
      throw new ForbiddenException('You cannot confirm this booking');
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
      },
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    const booking = await this.verifyTenantBooking(id, currentUser);

    if (currentUser.role === Roles.USER && booking.userId !== currentUser.sub) {
      throw new ForbiddenException('You cannot delete this booking');
    }

    return this.prisma.booking.delete({
      where: { id },
    });
  }
}
