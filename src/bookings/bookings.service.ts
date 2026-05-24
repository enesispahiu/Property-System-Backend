import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtPayload } from '../auth/jwt-payload.type';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
      include: {
        user: true,
        property: true,
        payments: true,
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

    if (!property || property.tenantId !== currentUser.tenantId) {
      throw new NotFoundException(
        `Property with id ${createBookingDto.propertyId} not found`,
      );
    }

    const bookingUserId =
      currentUser.role === 'ADMIN'
        ? (createBookingDto.userId ?? currentUser.sub)
        : currentUser.sub;

    const bookingUser = await this.prisma.user.findUnique({
      where: { id: bookingUserId },
    });

    if (!bookingUser || bookingUser.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('User must belong to the current tenant');
    }

    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        propertyId: createBookingDto.propertyId,
        status: {
          in: ['PENDING', 'CONFIRMED'],
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

    const totalPrice = this.calculateTotalPrice(
      startDate,
      endDate,
      property.price,
    );

    return this.prisma.booking.create({
      data: {
        startDate,
        endDate,
        status: createBookingDto.status || 'PENDING',
        totalPrice,
        userId: bookingUserId,
        propertyId: createBookingDto.propertyId,
        tenantId: property.tenantId,
      },
      include: {
        user: true,
        property: true,
        payments: true,
      },
    });
  }

  findAll(currentUser: JwtPayload) {
    return this.prisma.booking.findMany({
      where: {
        tenantId: currentUser.tenantId,
        ...(currentUser.role === 'ADMIN' ? {} : { userId: currentUser.sub }),
      },
      include: {
        user: true,
        property: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
      include: {
        user: true,
        property: true,
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }

    if (currentUser.role !== 'ADMIN' && booking.userId !== currentUser.sub) {
      throw new ForbiddenException('You cannot access this booking');
    }

    return booking;
  }

  async findByUser(userId: number, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.tenantId !== currentUser.tenantId) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    if (currentUser.role !== 'ADMIN' && userId !== currentUser.sub) {
      throw new ForbiddenException('You cannot access bookings for this user');
    }

    return this.prisma.booking.findMany({
      where: {
        userId,
        tenantId: currentUser.tenantId,
      },
      include: {
        property: true,
        payments: true,
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
      currentUser.role !== 'ADMIN' &&
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

    if (!property || property.tenantId !== currentUser.tenantId) {
      throw new NotFoundException(`Property with id ${propertyId} not found`);
    }

    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        id: {
          not: id,
        },
        propertyId,
        tenantId: currentUser.tenantId,
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

    const bookingUserId =
      currentUser.role === 'ADMIN'
        ? (updateBookingDto.userId ?? existingBooking.userId)
        : existingBooking.userId;

    if (bookingUserId !== existingBooking.userId) {
      const bookingUser = await this.prisma.user.findUnique({
        where: { id: bookingUserId },
      });

      if (!bookingUser || bookingUser.tenantId !== currentUser.tenantId) {
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
        startDate,
        endDate,
        totalPrice,
      },
      include: {
        user: true,
        property: true,
        payments: true,
      },
    });
  }

  async cancel(id: number, currentUser: JwtPayload) {
    const booking = await this.verifyTenantBooking(id, currentUser);

    if (currentUser.role !== 'ADMIN' && booking.userId !== currentUser.sub) {
      throw new ForbiddenException('You cannot cancel this booking');
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  async confirm(id: number, currentUser: JwtPayload) {
    const booking = await this.verifyTenantBooking(id, currentUser);

    if (currentUser.role !== 'ADMIN' && booking.userId !== currentUser.sub) {
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

    if (currentUser.role !== 'ADMIN' && booking.userId !== currentUser.sub) {
      throw new ForbiddenException('You cannot delete this booking');
    }

    return this.prisma.booking.delete({
      where: { id },
    });
  }
}
