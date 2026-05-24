import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';

@Controller('search')
@ApiTags('Search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('properties')
  @ApiOperation({ summary: 'Search public active properties with filters' })
  searchProperties(@Query() query: any) {
    return this.searchService.searchProperties(query);
  }

  @Get('history')
  @ApiOperation({ summary: 'List recent property search history' })
  getSearchHistory() {
    return this.searchService.getSearchHistory();
  }
}
