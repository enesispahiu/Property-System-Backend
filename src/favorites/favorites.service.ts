import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt-payload.type';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  private propertyInclude = {
    images: true,
    category: true,
    reviews: {
      select: {
        rating: true,
      },
    },
  } as const;

  private formatFavorite(favorite: any) {
    const reviews = Array.isArray(favorite.property?.reviews)
      ? favorite.property.reviews
      : [];
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
          reviews.length
        : null;
    const images = Array.isArray(favorite.property?.images)
      ? favorite.property.images
      : [];

    return {
      id: favorite.id,
      userId: favorite.userId,
      propertyId: favorite.propertyId,
      createdAt: favorite.createdAt,
      property: favorite.property
        ? {
            id: favorite.property.id,
            title: favorite.property.title,
            location: favorite.property.location,
            price: favorite.property.price,
            status: favorite.property.status,
            images,
            imageUrl: images[0]?.url ?? null,
            category: favorite.property.category ?? null,
            averageRating,
          }
        : null,
    };
  }

  async add(propertyId: number, currentUser: JwtPayload) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        status: 'ACTIVE',
        tenant: {
          status: 'ACTIVE',
        },
      },
      include: {
        tenant: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException(
        `Active property from an active tenant with id ${propertyId} not found`,
      );
    }

    const existing = await this.prisma.favoriteProperty.findUnique({
      where: {
        userId_propertyId: {
          userId: currentUser.sub,
          propertyId,
        },
      },
      include: {
        property: {
          include: this.propertyInclude,
        },
      },
    });

    if (existing) {
      return {
        message: 'Property is already saved',
        favorite: this.formatFavorite(existing),
      };
    }

    const favorite = await this.prisma.favoriteProperty.create({
      data: {
        userId: currentUser.sub,
        propertyId,
      },
      include: {
        property: {
          include: this.propertyInclude,
        },
      },
    });

    return {
      message: 'Property saved',
      favorite: this.formatFavorite(favorite),
    };
  }

  async findMine(currentUser: JwtPayload) {
    const favorites = await this.prisma.favoriteProperty.findMany({
      where: {
        userId: currentUser.sub,
        property: {
          status: 'ACTIVE',
          tenant: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        property: {
          include: this.propertyInclude,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return favorites.map((favorite) => this.formatFavorite(favorite));
  }

  async remove(propertyId: number, currentUser: JwtPayload) {
    const favorite = await this.prisma.favoriteProperty.findUnique({
      where: {
        userId_propertyId: {
          userId: currentUser.sub,
          propertyId,
        },
      },
    });

    if (!favorite) {
      throw new BadRequestException('Property is not saved');
    }

    await this.prisma.favoriteProperty.delete({
      where: {
        userId_propertyId: {
          userId: currentUser.sub,
          propertyId,
        },
      },
    });

    return {
      message: 'Property removed from saved properties',
      propertyId,
    };
  }
}
