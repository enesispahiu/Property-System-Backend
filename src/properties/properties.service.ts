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

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  private propertySelection = {
    tenant: true,
    owner: true,
    category: true,
    images: true,
    amenities: true,
    bookings: true,
    reviews: true,
    availability: true,
  };

  private async verifyTenantProperty(id: number, currentUser: JwtPayload) {
    const property = await this.prisma.property.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }

    return property;
  }

  async create(createPropertyDto: CreatePropertyDto, currentUser: JwtPayload) {
    const ownerId = createPropertyDto.ownerId || currentUser.sub;
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerId },
    });

    if (!owner || owner.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('Owner must belong to the current tenant');
    }

    return this.prisma.property.create({
      data: {
        ...createPropertyDto,
        tenantId: currentUser.tenantId,
        ownerId,
      },
    });
  }

  findAll(currentUser: JwtPayload) {
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

    if (
      !property ||
      ((!currentUser || property.tenantId !== currentUser.tenantId) &&
        property.status !== 'ACTIVE')
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

    return this.prisma.property.update({
      where: { id },
      data: updatePropertyDto,
    });
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
          tenantId: currentUser.tenantId,
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

    if (!image || image.property.tenantId !== currentUser.tenantId) {
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

    if (!propertyAmenity || propertyAmenity.property.tenantId !== currentUser.tenantId) {
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

    return this.prisma.property.delete({
      where: { id },
    });
  }
}
