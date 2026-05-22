import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

const reviewExample = {
  id: 5,
  rating: 5,
  comment: 'Clean apartment, responsive host, great location.',
  userId: 1,
  propertyId: 10,
  createdAt: '2026-05-22T20:00:00.000Z',
  updatedAt: '2026-05-22T20:00:00.000Z',
};

@Controller()
@ApiTags('Reviews')
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  @ApiOperation({ summary: 'Create a property review' })
  @ApiBody({ type: CreateReviewDto })
  @ApiCreatedResponse({ schema: { example: reviewExample } })
  @ApiResponse({
    status: 400,
    description: 'Invalid review payload or duplicate review',
  })
  @ApiNotFoundResponse({ description: 'Property or user not found' })
  createReview(@Body() dto: CreateReviewDto, @Req() req: any) {
    const userId = req.user?.id || req.body.userId;

    return this.reviewsService.createReview(dto, Number(userId));
  }

  @Get('properties/:propertyId/reviews')
  @ApiOperation({ summary: 'List reviews for a property' })
  @ApiOkResponse({ schema: { example: [reviewExample] } })
  @ApiNotFoundResponse({ description: 'Property not found' })
  getPropertyReviews(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.reviewsService.getPropertyReviews(propertyId);
  }

  @Get('properties/:propertyId/reviews/average')
  @ApiOperation({ summary: 'Get average rating for a property' })
  @ApiOkResponse({
    schema: {
      example: {
        propertyId: 10,
        averageRating: 4.7,
        totalReviews: 18,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  getAverageRating(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.reviewsService.getAverageRating(propertyId);
  }

  @Put('reviews/:id')
  @ApiOperation({ summary: 'Update a review' })
  @ApiBody({ type: UpdateReviewDto })
  @ApiOkResponse({ schema: { example: { ...reviewExample, rating: 4 } } })
  @ApiResponse({ status: 400, description: 'Invalid review update' })
  @ApiForbiddenResponse({
    description: 'Only the author or admin can update this review',
  })
  @ApiNotFoundResponse({ description: 'Review not found' })
  updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.body.userId;
    const role = req.user?.role || req.body.role || 'user';

    return this.reviewsService.updateReview(id, dto, Number(userId), role);
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Delete a review' })
  @ApiOkResponse({ schema: { example: reviewExample } })
  @ApiForbiddenResponse({
    description: 'Only the author or admin can delete this review',
  })
  @ApiNotFoundResponse({ description: 'Review not found' })
  deleteReview(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.id || req.body.userId;
    const role = req.user?.role || req.body.role || 'user';

    return this.reviewsService.deleteReview(id, Number(userId), role);
  }
}
