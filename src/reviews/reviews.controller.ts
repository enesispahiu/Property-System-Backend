import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.type';

@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  createReview(
    @Body() dto: CreateReviewDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.reviewsService.createReview(dto, currentUser);
  }

  @Get('properties/:propertyId/reviews')
  getPropertyReviews(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.reviewsService.getPropertyReviews(propertyId, currentUser);
  }

  @Get('properties/:propertyId/reviews/average')
  getAverageRating(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.reviewsService.getAverageRating(propertyId, currentUser);
  }

  @Put('reviews/:id')
  updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.reviewsService.updateReview(id, dto, currentUser);
  }

  @Delete('reviews/:id')
  deleteReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.reviewsService.deleteReview(id, currentUser);
  }
}
