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

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
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

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        domain: dto.domain,
        logoUrl: dto.logoUrl,
        primaryColor: dto.primaryColor,
      },
    });
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

    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTenant(id: number) {
    await this.findTenant(id);

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
      throw new BadRequestException(
        'Tenant cannot be permanently deleted because it has related data. Deactivate/archive is recommended.',
      );
    }

    return this.prisma.tenant.delete({ where: { id } });
  }

  async deactivateTenant(id: number) {
    await this.findTenant(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    await this.searchService.clearCache();

    return tenant;
  }

  async reactivateTenant(id: number) {
    await this.findTenant(id);

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await this.searchService.clearCache();

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

    return this.prisma.user.create({
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
  }

  private slugify(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
