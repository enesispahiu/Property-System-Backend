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
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreatePropertyImageDto } from './dto/create-property-image.dto';
import { AddPropertyAmenityDto } from './dto/add-property-amenity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.type';

@Controller('properties')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  create(
    @Body() createPropertyDto: CreatePropertyDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.create(createPropertyDto, currentUser);
  }

  @Get()
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.propertiesService.findAll(currentUser);
  }

  @Post(':id/images')
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() createPropertyImageDto: CreatePropertyImageDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.addImage(id, createPropertyImageDto, currentUser);
  }

  @Get(':id/images')
  getImages(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.getImages(id, currentUser);
  }

  @Delete('images/:imageId')
  removeImage(
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.removeImage(imageId, currentUser);
  }

  @Post(':id/amenities')
  addAmenity(
    @Param('id', ParseIntPipe) id: number,
    @Body() addPropertyAmenityDto: AddPropertyAmenityDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.addAmenity(id, addPropertyAmenityDto, currentUser);
  }

  @Get(':id/amenities')
  getAmenities(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.getAmenities(id, currentUser);
  }

  @Delete('amenities/:propertyAmenityId')
  removeAmenity(
    @Param('propertyAmenityId', ParseIntPipe) propertyAmenityId: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.removeAmenity(propertyAmenityId, currentUser);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.findOne(id, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.update(id, updatePropertyDto, currentUser);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.remove(id, currentUser);
  }
}
