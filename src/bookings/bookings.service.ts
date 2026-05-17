import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBookingDto: CreateBookingDto) {
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

    return this.prisma.booking.create({
      data: {
        startDate,
        endDate,
        status: createBookingDto.status || 'PENDING',
        userId: createBookingDto.userId,
        propertyId: createBookingDto.propertyId,
      },
      include: {
        user: true,
        property: true,
        payments: true,
      },
    });
  }

  findAll() {
    return this.prisma.booking.findMany({
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

  async findOne(id: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
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

  findByUser(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        property: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: number, updateBookingDto: UpdateBookingDto) {
    await this.findOne(id);

    return this.prisma.booking.update({
      where: { id },
      data: {
        ...updateBookingDto,
        startDate: updateBookingDto.startDate
          ? new Date(updateBookingDto.startDate)
          : undefined,
        endDate: updateBookingDto.endDate
          ? new Date(updateBookingDto.endDate)
          : undefined,
      },
      include: {
        user: true,
        property: true,
        payments: true,
      },
    });
  }

  async cancel(id: number) {
    await this.findOne(id);

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });
  }

  async confirm(id: number) {
    await this.findOne(id);

    return this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.booking.delete({
      where: { id },
    });
  }
}
