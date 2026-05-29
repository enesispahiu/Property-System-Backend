import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles as AppRoles } from '../auth/roles';
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoles.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List recent property search history' })
  getSearchHistory() {
    return this.searchService.getSearchHistory();
  }
}
