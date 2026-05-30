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
import { Roles } from '../auth/roles';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private readonly reviewInclude = {
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
  };

  private async verifyActiveProperty(propertyId: number) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        status: 'ACTIVE',
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  private async verifyReviewTenant(id: number, currentUser: JwtPayload) {
    if (currentUser.role === Roles.SUPER_ADMIN) {
      const review = await this.prisma.review.findUnique({ where: { id } });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      return review;
    }

    if (currentUser.role === Roles.USER) {
      const review = await this.prisma.review.findFirst({
        where: {
          id,
          userId: currentUser.sub,
        },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      return review;
    }

    if (!currentUser.tenantId) {
      throw new ForbiddenException('Tenant information is required');
    }

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

    const property = await this.verifyActiveProperty(dto.propertyId);

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
    });

    if (!user) {
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

    const review = await this.prisma.review.create({
      data: {
        rating: dto.rating,
        comment: dto.comment,
        userId: currentUser.sub,
        propertyId: dto.propertyId,
        tenantId: property.tenantId,
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

    await this.notificationsService.notifyTenantAdmins(property.tenantId, {
      title: 'New review submitted',
      message: `New review submitted for ${property.title}.`,
      type: 'TENANT_REVIEW_SUBMITTED',
    });

    return review;
  }

  async getPropertyReviews(propertyId: number) {
    await this.verifyActiveProperty(propertyId);

    return this.prisma.review.findMany({
      where: {
        propertyId,
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
  }

  async getAverageRating(propertyId: number) {
    await this.verifyActiveProperty(propertyId);

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

  async getReviewAnalysis(id: number, currentUser: JwtPayload) {
    await this.verifyReviewTenant(id, currentUser);

    const analysis = await this.prisma.reviewAnalysis.findUnique({
      where: { reviewId: id },
    });

    if (!analysis) {
      throw new NotFoundException('Review analysis not found');
    }

    return analysis;
  }

  async updateReview(
    id: number,
    dto: UpdateReviewDto,
    currentUser: JwtPayload,
  ) {
    const review = await this.verifyReviewTenant(id, currentUser);

    const isOwner = review.userId === currentUser.sub;
    const isAdmin =
      currentUser.role === Roles.TENANT_ADMIN ||
      currentUser.role === Roles.SUPER_ADMIN;

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
    const isAdmin =
      currentUser.role === Roles.TENANT_ADMIN ||
      currentUser.role === Roles.SUPER_ADMIN;

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
