import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockPrismaService = {
    review: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    reviewAnalysis: {
      findUnique: jest.fn(),
    },
    property: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReview', () => {
    const currentUser = {
      sub: 26,
      email: 'reviewer@example.com',
      roleId: 3,
      role: 'USER',
      tenantId: null,
    };

    it('creates a review for an active property from another tenant', async () => {
      const property = {
        id: 8,
        title: 'Beach Apartment',
        tenantId: 11,
        status: 'ACTIVE',
      };
      const review = {
        id: 21,
        propertyId: 8,
        userId: 26,
        tenantId: 11,
        rating: 5,
        comment: 'test review',
      };

      mockPrismaService.property.findFirst.mockResolvedValue(property);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 26,
        tenantId: 20,
      });
      mockPrismaService.review.findFirst.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(review);

      await expect(
        service.createReview(
          { propertyId: 8, rating: 5, comment: 'test review' },
          currentUser,
        ),
      ).resolves.toBe(review);

      expect(mockPrismaService.property.findFirst).toHaveBeenCalledWith({
        where: {
          id: 8,
          status: 'ACTIVE',
        },
      });
      expect(mockPrismaService.review.create).toHaveBeenCalledWith({
        data: {
          rating: 5,
          comment: 'test review',
          userId: 26,
          propertyId: 8,
          tenantId: 11,
        },
        include: {
          analysis: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    });

    it('rejects inactive or missing properties', async () => {
      mockPrismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.createReview(
          { propertyId: 8, rating: 5, comment: 'test review' },
          currentUser,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('keeps duplicate review prevention', async () => {
      mockPrismaService.property.findFirst.mockResolvedValue({
        id: 8,
        tenantId: 11,
        status: 'ACTIVE',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 26,
        tenantId: 20,
      });
      mockPrismaService.review.findFirst.mockResolvedValue({ id: 1 });

      await expect(
        service.createReview(
          { propertyId: 8, rating: 5, comment: 'test review' },
          currentUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getPropertyReviews', () => {
    it('returns reviews for an active property without tenant filtering', async () => {
      mockPrismaService.property.findFirst.mockResolvedValue({
        id: 8,
        tenantId: 11,
        status: 'ACTIVE',
      });
      mockPrismaService.review.findMany.mockResolvedValue([]);

      await expect(
        service.getPropertyReviews(8, {
          sub: 26,
          email: 'reviewer@example.com',
          roleId: 3,
          role: 'USER',
          tenantId: null,
        }),
      ).resolves.toEqual([]);

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        where: {
          propertyId: 8,
        },
        include: {
          analysis: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });
});
