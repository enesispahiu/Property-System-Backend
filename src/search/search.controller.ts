import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SearchService } from './search.service';

@Controller('search')
@ApiTags('Search')
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('properties')
  @ApiOperation({
    summary: 'Search properties with filters, sorting, and pagination',
  })
  @ApiQuery({ name: 'location', required: false, example: 'Warsaw' })
  @ApiQuery({ name: 'minPrice', required: false, example: '100' })
  @ApiQuery({ name: 'maxPrice', required: false, example: '250' })
  @ApiQuery({ name: 'rating', required: false, example: '4' })
  @ApiQuery({ name: 'categoryId', required: false, example: '3' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['price_asc', 'price_desc'],
    example: 'price_asc',
  })
  @ApiOkResponse({
    schema: {
      example: {
        data: [
          {
            id: 10,
            title: 'Modern apartment near city center',
            price: 145.5,
            location: 'Warsaw, Poland',
            averageRating: 4.8,
            totalReviews: 12,
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
        cached: false,
      },
    },
  })
  searchProperties(@Query() query: any) {
    return this.searchService.searchProperties(query);
  }

  @Get('history')
  @ApiOperation({ summary: 'List recent property search history' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          query: '{"location":"Warsaw","minPrice":"100"}',
          createdAt: '2026-05-22T20:00:00.000Z',
        },
      ],
    },
  })
  getSearchHistory() {
    return this.searchService.getSearchHistory();
  }
}
