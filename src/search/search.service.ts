import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  private cache = new Map<string, { data: any; expiresAt: number }>();

  constructor(private prisma: PrismaService) {}

  clearCache() {
    this.cache.clear();
  }

  private clearExpiredCache() {
    const now = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  async searchProperties(query: {
    location?: string;
    minPrice?: string;
    maxPrice?: string;
    rating?: string;
    category?: string;
    categoryId?: string;
    propertyType?: string;
    page?: string;
    limit?: string;
    sort?: string;
    sortBy?: string;
  }) {
    this.clearExpiredCache();

    const requestedPage = Number(query.page);
    const requestedLimit = Number(query.limit);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 10;

    const normalizedQuery = {
      ...query,
      page: String(page),
      limit: String(limit),
      sort: query.sort || query.sortBy,
    };
    delete normalizedQuery.sortBy;

    const cacheKey = JSON.stringify(normalizedQuery);
    const cachedResult = this.cache.get(cacheKey);

    await this.prisma.searchHistory.create({
      data: {
        query: JSON.stringify(normalizedQuery),
      },
    });

    if (cachedResult && cachedResult.expiresAt > Date.now()) {
      return {
        ...cachedResult.data,
        cached: true,
      };
    }

    const skip = (page - 1) * limit;

    const where: any = {
      status: 'ACTIVE',
      tenant: {
        status: 'ACTIVE',
      },
    };

    if (normalizedQuery.location) {
      where.location = {
        contains: normalizedQuery.location,
        mode: 'insensitive',
      };
    }

    if (normalizedQuery.minPrice || normalizedQuery.maxPrice) {
      where.price = {};

      if (normalizedQuery.minPrice) {
        where.price.gte = Number(normalizedQuery.minPrice);
      }

      if (normalizedQuery.maxPrice) {
        where.price.lte = Number(normalizedQuery.maxPrice);
      }
    }

    if (normalizedQuery.categoryId) {
      where.categoryId = Number(normalizedQuery.categoryId);
    }

    const categoryName = normalizedQuery.category || normalizedQuery.propertyType;

    if (categoryName) {
      where.category = {
        name: {
          contains: categoryName,
          mode: 'insensitive',
        },
      };
    }

    let orderBy: any = {
      createdAt: 'desc',
    };

    if (normalizedQuery.sort === 'price_asc') {
      orderBy = {
        price: 'asc',
      };
    }

    if (normalizedQuery.sort === 'price_desc') {
      orderBy = {
        price: 'desc',
      };
    }

    const properties = await this.prisma.property.findMany({
      where,
      orderBy,
      include: {
        tenant: true,
        category: true,
        images: true,
        reviews: true,
      },
    });

    let propertiesWithRating = properties.map((property) => {
      const totalReviews = property.reviews.length;

      const averageRating =
        totalReviews > 0
          ? property.reviews.reduce((sum, review) => sum + review.rating, 0) /
            totalReviews
          : 0;

      return {
        ...property,
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews,
      };
    });

    if (normalizedQuery.rating) {
      const minRating = Number(normalizedQuery.rating);

      propertiesWithRating = propertiesWithRating.filter(
        (property) => property.averageRating >= minRating,
      );
    }

    const total = propertiesWithRating.length;
    const paginatedProperties = propertiesWithRating.slice(skip, skip + limit);

    const meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    const result = {
      data: paginatedProperties,
      meta,
      pagination: meta,
      cached: false,
    };

    this.cache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + 60 * 1000,
    });

    return result;
  }

  async getSearchHistory() {
    return this.prisma.searchHistory.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }
}
