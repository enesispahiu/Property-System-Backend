import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchProperties(query: {
    location?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
    limit?: string;
    sort?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.location) {
      where.location = {
        contains: query.location,
        mode: 'insensitive',
      };
    }

    if (query.minPrice || query.maxPrice) {
      where.price = {};

      if (query.minPrice) {
        where.price.gte = Number(query.minPrice);
      }

      if (query.maxPrice) {
        where.price.lte = Number(query.maxPrice);
      }
    }

    let orderBy: any = {
      createdAt: 'desc',
    };

    if (query.sort === 'price_asc') {
      orderBy = {
        price: 'asc',
      };
    }

    if (query.sort === 'price_desc') {
      orderBy = {
        price: 'desc',
      };
    }

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.property.count({
        where,
      }),
    ]);

    return {
      data: properties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
