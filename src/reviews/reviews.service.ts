import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(dto: CreateReviewDto) {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    if (!dto.comment || dto.comment.trim() === '') {
      throw new BadRequestException('Comment is required');
    }

    const property = await this.prisma.property.findUnique({
      where: {
        id: dto.propertyId,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: dto.userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        userId: dto.userId,
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
        userId: dto.userId,
        propertyId: dto.propertyId,
      },
    });
  }

  async getPropertyReviews(propertyId: number) {
    const property = await this.prisma.property.findUnique({
      where: {
        id: propertyId,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return this.prisma.review.findMany({
      where: {
        propertyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAverageRating(propertyId: number) {
    const property = await this.prisma.property.findUnique({
      where: {
        id: propertyId,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const result = await this.prisma.review.aggregate({
      where: {
        propertyId,
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

  async updateReview(id: number, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: {
        id,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
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

  async deleteReview(id: number) {
    const review = await this.prisma.review.findUnique({
      where: {
        id,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.review.delete({
      where: {
        id,
      },
    });
  }
}
