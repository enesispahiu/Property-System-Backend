import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.type';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiTags('Favorites')
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':propertyId')
  @ApiOperation({ summary: 'Save an active property for the authenticated user' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 201, description: 'Property saved or already saved' })
  @ApiResponse({ status: 404, description: 'Active property not found' })
  add(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.favoritesService.add(propertyId, currentUser);
  }

  @Get('me')
  @ApiOperation({ summary: 'List saved properties for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Saved properties returned' })
  findMine(@CurrentUser() currentUser: JwtPayload) {
    return this.favoritesService.findMine(currentUser);
  }

  @Delete(':propertyId')
  @ApiOperation({ summary: 'Remove a saved property for the authenticated user' })
  @ApiParam({ name: 'propertyId', type: Number })
  @ApiResponse({ status: 200, description: 'Saved property removed' })
  remove(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.favoritesService.remove(propertyId, currentUser);
  }
}
