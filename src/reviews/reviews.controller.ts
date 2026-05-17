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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('reviews')
  createReview(@Body() dto: CreateReviewDto, @Req() req: any) {
    const userId = req.user?.id || req.body.userId;

    return this.reviewsService.createReview(dto, Number(userId));
  }

  @Get('properties/:propertyId/reviews')
  getPropertyReviews(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.reviewsService.getPropertyReviews(propertyId);
  }

  @Get('properties/:propertyId/reviews/average')
  getAverageRating(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.reviewsService.getAverageRating(propertyId);
  }

  @Put('reviews/:id')
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
  deleteReview(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.id || req.body.userId;
    const role = req.user?.role || req.body.role || 'user';

    return this.reviewsService.deleteReview(id, Number(userId), role);
  }
}
