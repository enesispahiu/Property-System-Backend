import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreatePropertyImageDto } from './dto/create-property-image.dto';
import { AddPropertyAmenityDto } from './dto/add-property-amenity.dto';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  create(createPropertyDto: CreatePropertyDto) {
    return this.prisma.property.create({
      data: createPropertyDto,
    });
  }

  findAll() {
    return this.prisma.property.findMany({
      include: {
        tenant: true,
        owner: true,
        category: true,
        images: true,
        amenities: true,
        bookings: true,
        reviews: true,
        availability: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        tenant: true,
        owner: true,
        category: true,
        images: true,
        amenities: true,
        bookings: true,
        reviews: true,
        availability: true,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with id ${id} not found`);
    }

    return property;
  }

  async update(id: number, updatePropertyDto: UpdatePropertyDto) {
    await this.findOne(id);

    return this.prisma.property.update({
      where: { id },
      data: updatePropertyDto,
    });
  }

  async addImage(id: number, createPropertyImageDto: CreatePropertyImageDto) {
    await this.findOne(id);

    return this.prisma.propertyImage.create({
      data: {
        url: createPropertyImageDto.url,
        propertyId: id,
      },
    });
  }

  async getImages(id: number) {
    await this.findOne(id);

    return this.prisma.propertyImage.findMany({
      where: {
        propertyId: id,
      },
    });
  }

  async removeImage(imageId: number) {
    const image = await this.prisma.propertyImage.findUnique({
      where: {
        id: imageId,
      },
    });

    if (!image) {
      throw new NotFoundException(
        `Property image with id ${imageId} not found`,
      );
    }

    return this.prisma.propertyImage.delete({
      where: {
        id: imageId,
      },
    });
  }

  async addAmenity(id: number, addPropertyAmenityDto: AddPropertyAmenityDto) {
    await this.findOne(id);

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

  async getAmenities(id: number) {
    await this.findOne(id);

    return this.prisma.propertyAmenity.findMany({
      where: {
        propertyId: id,
      },
      include: {
        amenity: true,
      },
    });
  }

  async removeAmenity(propertyAmenityId: number) {
    const propertyAmenity = await this.prisma.propertyAmenity.findUnique({
      where: {
        id: propertyAmenityId,
      },
    });

    if (!propertyAmenity) {
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

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.property.delete({
      where: { id },
    });
  }
}
