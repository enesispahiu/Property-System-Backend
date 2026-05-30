import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantAdminDto } from './dto/create-tenant-admin.dto';
import { SearchService } from '../search/search.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findTenants(options: { includeInactive?: boolean } = {}) {
    return this.prisma.tenant.findMany({
      where: options.includeInactive ? undefined : { status: 'ACTIVE' },
      include: {
        _count: {
          select: {
            users: true,
            properties: true,
            bookings: true,
            reviews: true,
            notifications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTenant(dto: CreateTenantDto) {
    const slug = dto.slug ?? this.slugify(dto.name);

    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Tenant slug is already in use');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        domain: dto.domain,
        logoUrl: dto.logoUrl,
        primaryColor: dto.primaryColor,
      },
    });

    await this.notificationsService.notifySuperAdmins({
      title: 'Tenant created',
      message: `Tenant ${tenant.name} was created.`,
      type: 'PLATFORM_TENANT_CREATED',
    });

    return tenant;
  }

  async findTenant(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            tenantId: true,
            role: { select: { name: true } },
            createdAt: true,
          },
        },
        properties: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${id} not found`);
    }

    return tenant;
  }

  async updateTenant(id: number, dto: UpdateTenantDto) {
    await this.findTenant(id);

    if (dto.slug) {
      const existing = await this.prisma.tenant.findUnique({
        where: { slug: dto.slug },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Tenant slug is already in use');
      }
    }

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: dto,
    });

    await this.notificationsService.notifySuperAdmins({
      title: 'Tenant updated',
      message: `Tenant ${tenant.name} was updated.`,
      type: 'PLATFORM_TENANT_UPDATED',
    });

    return tenant;
  }

  async deleteTenant(id: number) {
    const tenant = await this.findTenant(id);

    const hasData = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            users: true,
            properties: true,
            bookings: true,
            reviews: true,
            notifications: true,
          },
        },
      },
    });

    const count = hasData?._count;
    if (
      count &&
      (count.users > 0 ||
        count.properties > 0 ||
        count.bookings > 0 ||
        count.reviews > 0 ||
        count.notifications > 0)
    ) {
      await this.notificationsService.notifySuperAdmins({
        title: 'Tenant delete blocked',
        message: `Tenant ${tenant.name} could not be deleted because it has related data.`,
        type: 'PLATFORM_TENANT_DELETE_BLOCKED',
      });

      throw new BadRequestException(
        'Tenant cannot be permanently deleted because it has related data. Deactivate/archive is recommended.',
      );
    }

    const deletedTenant = await this.prisma.tenant.delete({ where: { id } });

    await this.notificationsService.notifySuperAdmins({
      title: 'Tenant deleted',
      message: `Tenant ${deletedTenant.name} was permanently deleted.`,
      type: 'PLATFORM_TENANT_DELETED',
    });

    return deletedTenant;
  }

  async deactivateTenant(id: number) {
    await this.findTenant(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    this.searchService.clearCache();
    await this.notificationsService.notifySuperAdmins({
      title: 'Tenant deactivated',
      message: `Tenant ${tenant.name} was deactivated.`,
      type: 'PLATFORM_TENANT_DEACTIVATED',
    });
    await this.notificationsService.notifyTenantAdmins(id, {
      title: 'Tenant deactivated',
      message: `Tenant ${tenant.name} was deactivated.`,
      type: 'TENANT_DEACTIVATED',
    });

    return tenant;
  }

  async reactivateTenant(id: number) {
    await this.findTenant(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    this.searchService.clearCache();
    await this.notificationsService.notifySuperAdmins({
      title: 'Tenant reactivated',
      message: `Tenant ${tenant.name} was reactivated.`,
      type: 'PLATFORM_TENANT_REACTIVATED',
    });
    await this.notificationsService.notifyTenantAdmins(id, {
      title: 'Tenant reactivated',
      message: `Tenant ${tenant.name} was reactivated.`,
      type: 'TENANT_REACTIVATED',
    });

    return tenant;
  }

  async createTenantAdmin(tenantId: number, dto: CreateTenantAdminDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${tenantId} not found`);
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const role =
      (await this.prisma.role.findUnique({
        where: { name: Roles.TENANT_ADMIN },
      })) ??
      (await this.prisma.role.create({
        data: { name: Roles.TENANT_ADMIN },
      }));

    const password = await bcrypt.hash(dto.password, 12);

    const admin = await this.prisma.user.create({
      data: {
        email: dto.email,
        password,
        tenantId,
        roleId: role.id,
      },
      select: {
        id: true,
        email: true,
        tenantId: true,
        role: { select: { name: true } },
        createdAt: true,
      },
    });

    await this.notificationsService.notifySuperAdmins({
      title: 'Tenant admin created',
      message: `Tenant admin ${admin.email} was created for ${tenant.name}.`,
      type: 'PLATFORM_TENANT_ADMIN_CREATED',
    });

    return admin;
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
