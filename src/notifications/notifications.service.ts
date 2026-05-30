import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt-payload.type';
import { Roles } from '../auth/roles';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private visibleToUserWhere(currentUser: JwtPayload) {
    if (currentUser.role === Roles.TENANT_ADMIN && currentUser.tenantId) {
      return {
        OR: [
          { userId: currentUser.sub },
          { userId: null, tenantId: currentUser.tenantId },
        ],
      };
    }

    return {
      userId: currentUser.sub,
    };
  }

  async create(data: {
    title: string;
    message: string;
    type: string;
    userId?: number | null;
    tenantId?: number | null;
    bookingId?: number | null;
  }) {
    if (!data.userId && !data.tenantId) {
      return null;
    }

    return this.prisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type,
        userId: data.userId ?? null,
        tenantId: data.tenantId ?? null,
        bookingId: data.bookingId ?? null,
      },
    });
  }

  notifyUser(
    userId: number,
    data: {
      title: string;
      message: string;
      type: string;
      tenantId?: number | null;
      bookingId?: number | null;
    },
  ) {
    return this.create({
      ...data,
      userId,
      tenantId: data.tenantId ?? null,
      bookingId: data.bookingId ?? null,
    });
  }

  async notifySuperAdmins(data: {
    title: string;
    message: string;
    type: string;
    bookingId?: number | null;
  }) {
    const admins = await this.prisma.user.findMany({
      where: { role: { name: Roles.SUPER_ADMIN } },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.notifyUser(admin.id, {
          ...data,
          tenantId: null,
          bookingId: data.bookingId ?? null,
        }),
      ),
    );
  }

  async notifyTenantAdmins(
    tenantId: number,
    data: {
      title: string;
      message: string;
      type: string;
      bookingId?: number | null;
    },
  ) {
    const admins = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { name: Roles.TENANT_ADMIN },
      },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.notifyUser(admin.id, {
          ...data,
          tenantId,
          bookingId: data.bookingId ?? null,
        }),
      ),
    );
  }

  findMine(currentUser: JwtPayload) {
    return this.prisma.notification.findMany({
      where: this.visibleToUserWhere(currentUser),
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(id: number, currentUser: JwtPayload) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        ...this.visibleToUserWhere(currentUser),
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with id ${id} not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
    });
  }

  async markAllRead(currentUser: JwtPayload) {
    const where = this.visibleToUserWhere(currentUser);

    if (!currentUser.sub) {
      throw new ForbiddenException('Notification scope is required');
    }

    await this.prisma.notification.updateMany({
      where: {
        ...where,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return this.findMine(currentUser);
  }
}
