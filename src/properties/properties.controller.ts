import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreatePropertyImageDto } from './dto/create-property-image.dto';
import { AddPropertyAmenityDto } from './dto/add-property-amenity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/jwt-payload.type';
import { Roles as AppRoles } from '../auth/roles';

@Controller('properties')
@ApiTags('Properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(AppRoles.TENANT_ADMIN, AppRoles.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a property for the current tenant' })
  create(
    @Body() createPropertyDto: CreatePropertyDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.create(createPropertyDto, currentUser);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List properties scoped by role' })
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.propertiesService.findAll(currentUser);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an image to a tenant property' })
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() createPropertyImageDto: CreatePropertyImageDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.addImage(id, createPropertyImageDto, currentUser);
  }

  @Get(':id/images')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List images for a tenant property' })
  getImages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.getImages(id, currentUser);
  }

  @Delete('images/:imageId')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an image from a tenant property' })
  removeImage(
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.removeImage(imageId, currentUser);
  }

  @Post(':id/amenities')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an amenity to a tenant property' })
  addAmenity(
    @Param('id', ParseIntPipe) id: number,
    @Body() addPropertyAmenityDto: AddPropertyAmenityDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.addAmenity(id, addPropertyAmenityDto, currentUser);
  }

  @Get(':id/amenities')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List amenities for a tenant property' })
  getAmenities(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.getAmenities(id, currentUser);
  }

  @Delete('amenities/:propertyAmenityId')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an amenity from a tenant property' })
  removeAmenity(
    @Param('propertyAmenityId', ParseIntPipe) propertyAmenityId: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.removeAmenity(propertyAmenityId, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public details for an active property' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(AppRoles.TENANT_ADMIN, AppRoles.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a property in the current tenant' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.update(id, updatePropertyDto, currentUser);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(AppRoles.TENANT_ADMIN, AppRoles.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a property in the current tenant' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.remove(id, currentUser);
  }
}
