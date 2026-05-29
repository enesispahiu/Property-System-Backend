import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';

describe('SearchService', () => {
  let service: SearchService;

  const mockPrismaService = {
    property: {
      findMany: jest.fn(),
    },
    searchHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const mockCacheService = {
    getJson: jest.fn(),
    setJson: jest.fn(),
    deleteByPattern: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCacheService.getJson.mockResolvedValue(null);
    mockCacheService.setJson.mockResolvedValue(undefined);
    mockCacheService.deleteByPattern.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns page 1 with pagination metadata and active tenant-scoped properties only', async () => {
    mockPrismaService.property.findMany.mockResolvedValue(activeProperties(7));
    mockPrismaService.searchHistory.create.mockResolvedValue({});

    const result = await service.searchProperties({ page: '1', limit: '3' });

    expect(result.data).toHaveLength(3);
    expect(result.data.map((property) => property.id)).toEqual([1, 2, 3]);
    expect(result.meta).toEqual({
      page: 1,
      limit: 3,
      total: 7,
      totalPages: 3,
    });
    expect(result.pagination).toEqual(result.meta);
    expect(mockPrismaService.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'ACTIVE',
          tenant: {
            status: 'ACTIVE',
          },
        },
      }),
    );
  });

  it('returns page 2 with the next active properties', async () => {
    mockPrismaService.property.findMany.mockResolvedValue(activeProperties(7));
    mockPrismaService.searchHistory.create.mockResolvedValue({});

    const result = await service.searchProperties({ page: '2', limit: '3' });

    expect(result.data.map((property) => property.id)).toEqual([4, 5, 6]);
    expect(result.meta).toEqual({
      page: 2,
      limit: 3,
      total: 7,
      totalPages: 3,
    });
  });

  it('excludes inactive properties and properties from inactive tenants through the Prisma filter', async () => {
    mockPrismaService.property.findMany.mockResolvedValue(activeProperties(2));
    mockPrismaService.searchHistory.create.mockResolvedValue({});

    const result = await service.searchProperties({ page: '1', limit: '10' });

    expect(result.data.every((property) => property.status === 'ACTIVE')).toBe(
      true,
    );
    expect(
      result.data.every((property) => property.tenant.status === 'ACTIVE'),
    ).toBe(true);
    expect(mockPrismaService.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          tenant: {
            status: 'ACTIVE',
          },
        }),
      }),
    );
  });

  it('keeps filters and sorting while paginating', async () => {
    mockPrismaService.property.findMany.mockResolvedValue([
      propertyFixture({
        id: 10,
        location: 'Tokyo, Japan',
        price: 180,
        categoryName: 'Studio',
        reviews: [{ rating: 5 }, { rating: 4 }],
      }),
      propertyFixture({
        id: 11,
        location: 'Tokyo, Japan',
        price: 220,
        categoryName: 'Studio',
        reviews: [{ rating: 5 }, { rating: 5 }],
      }),
    ]);
    mockPrismaService.searchHistory.create.mockResolvedValue({});

    const result = await service.searchProperties({
      location: 'Tokyo',
      minPrice: '100',
      maxPrice: '300',
      rating: '4.8',
      category: 'Studio',
      sort: 'price_asc',
      page: '1',
      limit: '6',
    });

    expect(result.data.map((property) => property.id)).toEqual([11]);
    expect(result.meta).toEqual({
      page: 1,
      limit: 6,
      total: 1,
      totalPages: 1,
    });
    expect(mockPrismaService.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          location: { contains: 'Tokyo', mode: 'insensitive' },
          price: { gte: 100, lte: 300 },
          category: {
            name: {
              contains: 'Studio',
              mode: 'insensitive',
            },
          },
        }),
        orderBy: { price: 'asc' },
      }),
    );
  });

  it('keeps page and limit in the normalized cache key', async () => {
    mockPrismaService.property.findMany.mockResolvedValue(activeProperties(7));
    mockPrismaService.searchHistory.create.mockResolvedValue({});

    const firstPage = await service.searchProperties({ page: '1', limit: '3' });
    const secondPage = await service.searchProperties({ page: '2', limit: '3' });

    expect(firstPage.data.map((property) => property.id)).toEqual([1, 2, 3]);
    expect(secondPage.data.map((property) => property.id)).toEqual([4, 5, 6]);
    expect(mockPrismaService.property.findMany).toHaveBeenCalledTimes(2);
    expect(mockCacheService.getJson.mock.calls[0][0]).toContain('"page":"1"');
    expect(mockCacheService.getJson.mock.calls[1][0]).toContain('"page":"2"');
  });

  it('returns cached search results without querying properties', async () => {
    mockCacheService.getJson.mockResolvedValueOnce({
      data: [{ id: 99, title: 'Cached result' }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      cached: false,
    });
    mockPrismaService.searchHistory.create.mockResolvedValue({});

    const result = await service.searchProperties({
      location: 'Prishtina',
      minPrice: '50',
      maxPrice: '100',
      rating: '4',
      category: 'Apartment',
      page: '1',
      limit: '10',
      sort: 'price_asc',
    });

    expect(result.cached).toBe(true);
    expect(result.data).toEqual([{ id: 99, title: 'Cached result' }]);
    expect(mockPrismaService.property.findMany).not.toHaveBeenCalled();
    expect(mockCacheService.getJson).toHaveBeenCalledWith(
      expect.stringContaining('search:properties:'),
    );
  });

  it('clears public search cache by Redis key pattern', async () => {
    await service.clearCache();

    expect(mockCacheService.deleteByPattern).toHaveBeenCalledWith(
      'search:properties:*',
    );
  });
});

function activeProperties(count: number) {
  return Array.from({ length: count }, (_, index) =>
    propertyFixture({ id: index + 1 }),
  );
}

function propertyFixture(overrides: any = {}) {
  return {
    id: overrides.id ?? 1,
    title: `Property ${overrides.id ?? 1}`,
    location: overrides.location ?? 'London, UK',
    price: overrides.price ?? 100 + (overrides.id ?? 1),
    status: overrides.status ?? 'ACTIVE',
    tenant: { status: overrides.tenantStatus ?? 'ACTIVE' },
    category: { name: overrides.categoryName ?? 'Apartment' },
    images: [],
    reviews: overrides.reviews ?? [],
    ...overrides,
  };
}
