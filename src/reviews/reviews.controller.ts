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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.type';

@Controller()
@ApiTags('Reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for an active property' })
  createReview(
    @Body() dto: CreateReviewDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.reviewsService.createReview(dto, currentUser);
  }

  @Get('properties/:propertyId/reviews')
  @ApiOperation({ summary: 'List public reviews for an active property' })
  getPropertyReviews(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.reviewsService.getPropertyReviews(propertyId);
  }

  @Get('properties/:propertyId/reviews/average')
  @ApiOperation({ summary: 'Get public average rating for an active property' })
  getAverageRating(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.reviewsService.getAverageRating(propertyId);
  }

  @Put('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review owned by the user or tenant admin' })
  updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.reviewsService.updateReview(id, dto, currentUser);
  }

  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review owned by the user or tenant admin' })
  deleteReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.reviewsService.deleteReview(id, currentUser);
  }
}
