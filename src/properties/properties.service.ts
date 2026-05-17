import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

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

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.property.delete({
      where: { id },
    });
  }
}
