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
import { JwtPayload } from '../auth/jwt-payload.type';
import { Roles } from '../auth/roles';
import { SearchService } from '../search/search.service';

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
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
        tenantId,
        ownerId,
      },
    });

    await this.searchService.clearCache();

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
    await this.verifyTenantProperty(id, currentUser);

    const data = { ...updatePropertyDto };
    delete data.tenantId;

    const property = await this.prisma.property.update({
      where: { id },
      data,
    });

    await this.searchService.clearCache();

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
      throw new NotFoundException(`Property image with id ${imageId} not found`);
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

    return property;
  }
}
