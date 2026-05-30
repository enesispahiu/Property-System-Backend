import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt-payload.type';
import { Roles } from '../auth/roles';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  private canViewInvoice(invoice: any, currentUser: JwtPayload) {
    if (currentUser.role === Roles.SUPER_ADMIN) {
      return true;
    }

    if (currentUser.role === Roles.TENANT_ADMIN) {
      return invoice.booking.tenantId === currentUser.tenantId;
    }

    return invoice.booking.userId === currentUser.sub;
  }

  findMine(currentUser: JwtPayload) {
    if (currentUser.role === Roles.TENANT_ADMIN && !currentUser.tenantId) {
      throw new ForbiddenException('Tenant information is required');
    }
    const tenantId = currentUser.tenantId;

    return this.prisma.invoice.findMany({
      where:
        currentUser.role === Roles.SUPER_ADMIN
          ? {}
          : currentUser.role === Roles.TENANT_ADMIN
            ? { booking: { tenantId: tenantId as number } }
            : { booking: { userId: currentUser.sub } },
      include: {
        payment: true,
        booking: {
          include: {
            property: true,
            user: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        payment: true,
        booking: {
          include: {
            property: true,
            user: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${id} not found`);
    }

    if (!this.canViewInvoice(invoice, currentUser)) {
      throw new ForbiddenException('You cannot view this invoice');
    }

    return invoice;
  }

  async findByBooking(bookingId: number, currentUser: JwtPayload) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { bookingId },
      include: {
        payment: true,
        booking: {
          include: {
            property: true,
            user: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(
        `Invoice for booking with id ${bookingId} not found`,
      );
    }

    if (!this.canViewInvoice(invoice, currentUser)) {
      throw new ForbiddenException('You cannot view this invoice');
    }

    return invoice;
  }
}
