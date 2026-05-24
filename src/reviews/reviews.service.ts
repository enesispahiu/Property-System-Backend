import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtPayload } from '../auth/jwt-payload.type';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  private async verifyPropertyTenant(
    propertyId: number,
    currentUser: JwtPayload,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  private async verifyReviewTenant(id: number, currentUser: JwtPayload) {
    const review = await this.prisma.review.findFirst({
      where: {
        id,
        tenantId: currentUser.tenantId,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  async createReview(dto: CreateReviewDto, currentUser: JwtPayload) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    if (!dto.comment || dto.comment.trim() === '') {
      throw new BadRequestException('Comment is required');
    }

    const property = await this.verifyPropertyTenant(dto.propertyId, currentUser);

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
    });

    if (!user || user.tenantId !== currentUser.tenantId) {
      throw new NotFoundException('User not found');
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        userId: currentUser.sub,
        propertyId: dto.propertyId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('User already reviewed this property');
    }

    return this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment,
        userId: currentUser.sub,
        propertyId: dto.propertyId,
        tenantId: property.tenantId,
      },
      include: {
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
  }

  async getPropertyReviews(propertyId: number, currentUser: JwtPayload) {
    await this.verifyPropertyTenant(propertyId, currentUser);

    return this.prisma.review.findMany({
      where: {
        propertyId,
        tenantId: currentUser.tenantId,
      },
      include: {
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
  }

  async getAverageRating(propertyId: number, currentUser: JwtPayload) {
    await this.verifyPropertyTenant(propertyId, currentUser);

    const result = await this.prisma.review.aggregate({
      where: {
        propertyId,
        tenantId: currentUser.tenantId,
      },
      _avg: {
        rating: true,
      },
      _count: {
        rating: true,
      },
    });

    return {
      propertyId,
      averageRating: result._avg.rating || 0,
      totalReviews: result._count.rating,
    };
  }

  async updateReview(
    id: number,
    dto: UpdateReviewDto,
    currentUser: JwtPayload,
  ) {
    const review = await this.verifyReviewTenant(id, currentUser);

    const isOwner = review.userId === currentUser.sub;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You are not allowed to update this review');
    }

    if (dto.rating !== undefined && (dto.rating < 1 || dto.rating > 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    if (dto.comment !== undefined && dto.comment.trim() === '') {
      throw new BadRequestException('Comment cannot be empty');
    }

    return this.prisma.review.update({
      where: {
        id,
      },
      data: dto,
    });
  }

  async deleteReview(id: number, currentUser: JwtPayload) {
    const review = await this.verifyReviewTenant(id, currentUser);

    const isOwner = review.userId === currentUser.sub;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You are not allowed to delete this review');
    }

    return this.prisma.review.delete({
      where: {
        id,
      },
    });
  }
}
