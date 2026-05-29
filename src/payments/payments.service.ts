import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt-payload.type';
import { PayBookingDto } from './dto/pay-booking.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async payBooking(bookingId: number, dto: PayBookingDto, currentUser: JwtPayload) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: true,
        property: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with id ${bookingId} not found`);
    }

    if (booking.userId !== currentUser.sub) {
      throw new ForbiddenException('You cannot pay for this booking');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled bookings cannot be paid');
    }

    const paidPayment = booking.payments.find(
      (payment) => payment.status === 'PAID',
    );

    if (booking.status === 'CONFIRMED' || paidPayment) {
      return {
        message: 'Booking is already paid',
        booking,
        payment: paidPayment ?? booking.payments[0] ?? null,
      };
    }

    const amount = Number(booking.totalPrice || 0);

    return this.prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findFirst({
        where: {
          bookingId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const payment = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              amount,
              status: 'PAID',
              method: dto.method,
            },
          })
        : await tx.payment.create({
            data: {
              amount,
              status: 'PAID',
              method: dto.method,
              bookingId,
            },
          });

      const confirmedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CONFIRMED',
        },
        include: {
          user: true,
          property: true,
          payments: true,
        },
      });

      return {
        message: 'Payment completed',
        booking: confirmedBooking,
        payment,
      };
    });
  }
}
