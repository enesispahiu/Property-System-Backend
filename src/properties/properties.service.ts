import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreatePropertyImageDto } from './dto/create-property-image.dto';
import { AddPropertyAmenityDto } from './dto/add-property-amenity.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreatePropertyRuleDto } from './dto/create-property-rule.dto';
import { JwtPayload } from '../auth/jwt-payload.type';
import { Roles } from '../auth/roles';
import { SearchService } from '../search/search.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private propertySelection = {
    tenant: true,
    owner: {
      select: {
        id: true,
        email: true,
        roleId: true,
        tenantId: true,
        role: true,
      },
    },
    category: true,
    images: true,
    amenities: {
      include: {
        amenity: true,
      },
    },
    bookings: true,
    reviews: true,
    availability: true,
    rules: true,
    cancellationPolicy: true,
  };

  private requireTenantId(currentUser: JwtPayload) {
    if (!currentUser.tenantId) {
      throw new ForbiddenException('Tenant information is required');
    }

    return currentUser.tenantId;
  }

  private async verifyTenantProperty(id: number, currentUser: JwtPayload) {
    if (currentUser.role === Roles.SUPER_ADMIN) {
      const property = await this.prisma.property.findUnique({ where: { id } });

      if (!property) {
        throw new NotFoundException(`Property with id ${id} not found`);
      }

      return property;
    }

    const tenantId = this.requireTenantId(currentUser);

    const property = await this.prisma.property.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }

    return property;
  }

  private async notifyPropertyAdmins(
    property: { title: string; tenantId: number },
    currentUser: JwtPayload,
    data: { title: string; message: string; type: string },
  ) {
    await this.notificationsService.notifyTenantAdmins(property.tenantId, data);

    if (currentUser.role === Roles.SUPER_ADMIN) {
      await this.notificationsService.notifySuperAdmins(data);
    }
  }

  async create(createPropertyDto: CreatePropertyDto, currentUser: JwtPayload) {
    let tenantId = currentUser.tenantId;

    if (currentUser.role === Roles.SUPER_ADMIN) {
      if (!createPropertyDto.tenantId) {
        throw new BadRequestException(
          'tenantId is required when SUPER_ADMIN creates a property',
        );
      }

      tenantId = createPropertyDto.tenantId;
    }

    if (!tenantId) {
      throw new ForbiddenException('Tenant information is required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with id ${tenantId} not found`);
    }

    if (tenant.status !== 'ACTIVE' && createPropertyDto.status !== 'INACTIVE') {
      throw new ForbiddenException(
        'Tenant is inactive and cannot create active properties',
      );
    }

    const ownerId =
      currentUser.role === Roles.SUPER_ADMIN
        ? createPropertyDto.ownerId
        : currentUser.sub;

    if (!ownerId) {
      throw new BadRequestException(
        'ownerId is required when SUPER_ADMIN creates a property',
      );
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner || owner.tenantId !== tenantId) {
      throw new ForbiddenException('Owner must belong to the current tenant');
    }

    const property = await this.prisma.property.create({
      data: {
        title: createPropertyDto.title,
        description: createPropertyDto.description,
        price: createPropertyDto.price,
        location: createPropertyDto.location,
        status: createPropertyDto.status,
        categoryId: createPropertyDto.categoryId,
        cancellationPolicyId: createPropertyDto.cancellationPolicyId,
        tenantId,
        ownerId,
      },
    });

    await this.searchService.clearCache();

    await this.notifyPropertyAdmins(property, currentUser, {
      title: 'Property created',
      message: `Property ${property.title} was created.`,
      type: 'PROPERTY_CREATED',
    });

    return property;
  }

  findAll(currentUser: JwtPayload) {
    if (currentUser.role === Roles.SUPER_ADMIN) {
      return this.prisma.property.findMany({
        include: this.propertySelection,
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    if (!currentUser.tenantId) {
      return this.prisma.property.findMany({
        where: { status: 'ACTIVE' },
        include: this.propertySelection,
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return this.prisma.property.findMany({
      where: { tenantId: currentUser.tenantId },
      include: this.propertySelection,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number, currentUser?: JwtPayload) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: this.propertySelection,
    });

    const canViewInactive =
      currentUser?.role === Roles.SUPER_ADMIN ||
      (currentUser?.role === Roles.TENANT_ADMIN &&
        property?.tenantId === currentUser.tenantId);

    if (
      !property ||
      ((property.status !== 'ACTIVE' || property.tenant.status !== 'ACTIVE') &&
        !canViewInactive)
    ) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }

    return property;
  }

  async update(
    id: number,
    updatePropertyDto: UpdatePropertyDto,
    currentUser: JwtPayload,
  ) {
    const existingProperty = await this.verifyTenantProperty(id, currentUser);

    const data = { ...updatePropertyDto };
    delete data.tenantId;

    const property = await this.prisma.property.update({
      where: { id },
      data,
    });

    await this.searchService.clearCache();

    const notification =
      existingProperty.status !== 'INACTIVE' && property.status === 'INACTIVE'
        ? {
            title: 'Property deactivated',
            message: `Property ${property.title} was removed from public listings.`,
            type: 'PROPERTY_DEACTIVATED',
          }
        : existingProperty.status === 'INACTIVE' && property.status === 'ACTIVE'
          ? {
              title: 'Property reactivated',
              message: `Property ${property.title} was reactivated.`,
              type: 'PROPERTY_REACTIVATED',
            }
          : {
              title: 'Property updated',
              message: `Property ${property.title} was updated.`,
              type: 'PROPERTY_UPDATED',
            };

    await this.notifyPropertyAdmins(property, currentUser, notification);

    return property;
  }

  async addImage(
    id: number,
    createPropertyImageDto: CreatePropertyImageDto,
    currentUser: JwtPayload,
  ) {
    await this.verifyTenantProperty(id, currentUser);

    return this.prisma.propertyImage.create({
      data: {
        url: createPropertyImageDto.url,
        propertyId: id,
      },
    });
  }

  async getImages(id: number, currentUser: JwtPayload) {
    await this.verifyTenantProperty(id, currentUser);

    return this.prisma.propertyImage.findMany({
      where: {
        property: {
          id,
          ...(currentUser.role === Roles.SUPER_ADMIN
            ? {}
            : { tenantId: this.requireTenantId(currentUser) }),
        },
      },
    });
  }

  async removeImage(imageId: number, currentUser: JwtPayload) {
    const image = await this.prisma.propertyImage.findUnique({
      where: { id: imageId },
      include: {
        property: true,
      },
    });

    if (
      !image ||
      (currentUser.role !== Roles.SUPER_ADMIN &&
        image.property.tenantId !== currentUser.tenantId)
    ) {
      throw new NotFoundException(
        `Property image with id ${imageId} not found`,
      );
    }

    return this.prisma.propertyImage.delete({
      where: { id: imageId },
    });
  }

  async addAmenity(
    id: number,
    addPropertyAmenityDto: AddPropertyAmenityDto,
    currentUser: JwtPayload,
  ) {
    await this.verifyTenantProperty(id, currentUser);

    const amenity = await this.prisma.amenity.findUnique({
      where: {
        id: addPropertyAmenityDto.amenityId,
      },
    });

    if (!amenity) {
      throw new NotFoundException(
        `Amenity with id ${addPropertyAmenityDto.amenityId} not found`,
      );
    }

    const existingAmenity = await this.prisma.propertyAmenity.findFirst({
      where: {
        propertyId: id,
        amenityId: addPropertyAmenityDto.amenityId,
      },
    });

    if (existingAmenity) {
      throw new BadRequestException(
        `Amenity with id ${addPropertyAmenityDto.amenityId} is already assigned to this property`,
      );
    }

    return this.prisma.propertyAmenity.create({
      data: {
        propertyId: id,
        amenityId: addPropertyAmenityDto.amenityId,
      },
      include: {
        amenity: true,
        property: true,
      },
    });
  }

  async getAmenities(id: number, currentUser: JwtPayload) {
    await this.verifyTenantProperty(id, currentUser);

    return this.prisma.propertyAmenity.findMany({
      where: {
        propertyId: id,
      },
      include: {
        amenity: true,
      },
    });
  }

  async removeAmenity(propertyAmenityId: number, currentUser: JwtPayload) {
    const propertyAmenity = await this.prisma.propertyAmenity.findUnique({
      where: {
        id: propertyAmenityId,
      },
      include: {
        property: true,
      },
    });

    if (
      !propertyAmenity ||
      (currentUser.role !== Roles.SUPER_ADMIN &&
        propertyAmenity.property.tenantId !== currentUser.tenantId)
    ) {
      throw new NotFoundException(
        `Property amenity with id ${propertyAmenityId} not found`,
      );
    }

    return this.prisma.propertyAmenity.delete({
      where: {
        id: propertyAmenityId,
      },
    });
  }

  async remove(id: number, currentUser: JwtPayload) {
    await this.verifyTenantProperty(id, currentUser);

    const property = await this.prisma.property.update({
      where: { id },
      data: {
        status: 'INACTIVE',
      },
      include: this.propertySelection,
    });

    await this.searchService.clearCache();

    await this.notifyPropertyAdmins(property, currentUser, {
      title: 'Property deactivated',
      message: `Property ${property.title} was removed from public listings.`,
      type: 'PROPERTY_DEACTIVATED',
    });

    return property;
  }

  async reactivate(id: number, currentUser: JwtPayload) {
    await this.verifyTenantProperty(id, currentUser);

    const property = await this.prisma.property.update({
      where: { id },
      data: {
        status: 'ACTIVE',
      },
      include: this.propertySelection,
    });

    await this.searchService.clearCache();

    await this.notifyPropertyAdmins(property, currentUser, {
      title: 'Property reactivated',
      message: `Property ${property.title} was reactivated.`,
      type: 'PROPERTY_REACTIVATED',
    });

    return property;
  }

  async getAvailability(propertyId: number, currentUser?: JwtPayload) {
    await this.findOne(propertyId, currentUser);

    return this.prisma.availability.findMany({
      where: { propertyId },
      orderBy: { startDate: 'asc' },
    });
  }

  async addAvailability(
    propertyId: number,
    dto: CreateAvailabilityDto,
    currentUser: JwtPayload,
  ) {
    await this.verifyTenantProperty(propertyId, currentUser);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const overlappingBooking = await this.prisma.booking.findFirst({
      where: {
        propertyId,
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
        'Availability block overlaps an existing booking',
      );
    }

    const overlappingBlock = await this.prisma.availability.findFirst({
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

    if (overlappingBlock) {
      throw new BadRequestException(
        'Availability block overlaps another unavailable date range',
      );
    }

    const availability = await this.prisma.availability.create({
      data: {
        propertyId,
        startDate,
        endDate,
        reason: dto.reason?.trim() || null,
      },
    });

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { title: true, tenantId: true },
    });

    if (property) {
      await this.notifyPropertyAdmins(property, currentUser, {
        title: 'Availability blocked',
        message: `Availability was blocked for ${property.title} from ${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}.`,
        type: 'AVAILABILITY_BLOCK_ADDED',
      });
    }

    return availability;
  }

  async removeAvailability(id: number, currentUser: JwtPayload) {
    const availability = await this.prisma.availability.findUnique({
      where: { id },
      include: { property: true },
    });

    if (
      !availability ||
      (currentUser.role !== Roles.SUPER_ADMIN &&
        availability.property.tenantId !== currentUser.tenantId)
    ) {
      throw new NotFoundException(`Availability with id ${id} not found`);
    }

    const deletedAvailability = await this.prisma.availability.delete({
      where: { id },
    });

    await this.notifyPropertyAdmins(availability.property, currentUser, {
      title: 'Availability block removed',
      message: `Availability block was removed for ${availability.property.title}.`,
      type: 'AVAILABILITY_BLOCK_REMOVED',
    });

    return deletedAvailability;
  }

  getCancellationPolicies() {
    return this.prisma.cancellationPolicy.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getRules(propertyId: number, currentUser?: JwtPayload) {
    await this.findOne(propertyId, currentUser);

    return this.prisma.propertyRule.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addRule(
    propertyId: number,
    dto: CreatePropertyRuleDto,
    currentUser: JwtPayload,
  ) {
    await this.verifyTenantProperty(propertyId, currentUser);

    return this.prisma.propertyRule.create({
      data: {
        propertyId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
      },
    });
  }

  async removeRule(ruleId: number, currentUser: JwtPayload) {
    const rule = await this.prisma.propertyRule.findUnique({
      where: { id: ruleId },
      include: { property: true },
    });

    if (
      !rule ||
      (currentUser.role !== Roles.SUPER_ADMIN &&
        rule.property.tenantId !== currentUser.tenantId)
    ) {
      throw new NotFoundException(`Property rule with id ${ruleId} not found`);
    }

    return this.prisma.propertyRule.delete({
      where: { id: ruleId },
    });
  }
}
