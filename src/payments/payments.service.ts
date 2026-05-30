import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt-payload.type';
import { PayBookingDto } from './dto/pay-booking.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async payBooking(
    bookingId: number,
    dto: PayBookingDto,
    currentUser: JwtPayload,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: true,
        property: true,
        user: true,
        invoice: true,
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
      const invoice =
        booking.invoice ??
        (paidPayment
          ? await this.prisma.invoice.findUnique({
              where: { paymentId: paidPayment.id },
            })
          : null);

      return {
        message: 'Booking is already paid',
        booking,
        payment: paidPayment ?? booking.payments[0] ?? null,
        invoice,
      };
    }

    const amount = Number(booking.totalPrice || 0);

    const result = await this.prisma.$transaction(async (tx) => {
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
          invoice: true,
        },
      });

      const existingInvoice = await tx.invoice.findUnique({
        where: { bookingId },
      });
      const invoice =
        existingInvoice ??
        (await tx.invoice.create({
          data: {
            invoiceNumber: `INV-${bookingId}-${payment.id}`,
            status: 'PAID',
            subtotal: amount,
            totalAmount: amount,
            billingName: booking.user.email,
            billingEmail: booking.user.email,
            paidAt: new Date(),
            bookingId,
            paymentId: payment.id,
          },
        }));

      return {
        message: 'Payment completed',
        booking: confirmedBooking,
        payment,
        invoice,
      };
    });

    await this.notificationsService.notifyUser(booking.userId, {
      title: 'Payment completed',
      message: `Payment completed for ${booking.property.title}.`,
      type: 'PAYMENT_COMPLETED',
      tenantId: booking.tenantId,
      bookingId,
    });
    await this.notificationsService.notifyTenantAdmins(booking.tenantId, {
      title: 'Payment completed',
      message: `Payment completed for ${booking.property.title}.`,
      type: 'TENANT_PAYMENT_COMPLETED',
      bookingId,
    });

    return result;
  }
}
