import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  private readonly cachePrefix = 'search:properties';

  constructor(
    private prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async clearCache() {
    await this.cache.deleteByPattern(`${this.cachePrefix}:*`);
  }

  private createCacheKey(query: Record<string, string | undefined>) {
    const cacheKeyParams = {
      location: query.location || '',
      minPrice: query.minPrice || '',
      maxPrice: query.maxPrice || '',
      rating: query.rating || '',
      category: query.category || query.propertyType || '',
      categoryId: query.categoryId || '',
      page: query.page || '',
      limit: query.limit || '',
      sort: query.sort || '',
    };

    return `${this.cachePrefix}:${JSON.stringify(cacheKeyParams)}`;
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

    const cacheKey = this.createCacheKey(normalizedQuery);

    await this.prisma.searchHistory.create({
      data: {
        query: JSON.stringify(normalizedQuery),
      },
    });

    const cachedResult = await this.cache.getJson<any>(cacheKey);

    if (cachedResult) {
      return {
        ...cachedResult,
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

    await this.cache.setJson(cacheKey, result);

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
