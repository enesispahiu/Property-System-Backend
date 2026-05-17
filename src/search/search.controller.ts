import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('properties')
  searchProperties(@Query() query: any) {
    return this.searchService.searchProperties(query);
  }
}
