import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreatePropertyImageDto } from './dto/create-property-image.dto';
import { AddPropertyAmenityDto } from './dto/add-property-amenity.dto';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertiesService.create(createPropertyDto);
  }

  @Get()
  findAll() {
    return this.propertiesService.findAll();
  }

  @Post(':id/images')
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() createPropertyImageDto: CreatePropertyImageDto,
  ) {
    return this.propertiesService.addImage(id, createPropertyImageDto);
  }

  @Get(':id/images')
  getImages(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.getImages(id);
  }

  @Delete('images/:imageId')
  removeImage(@Param('imageId', ParseIntPipe) imageId: number) {
    return this.propertiesService.removeImage(imageId);
  }

  @Post(':id/amenities')
  addAmenity(
    @Param('id', ParseIntPipe) id: number,
    @Body() addPropertyAmenityDto: AddPropertyAmenityDto,
  ) {
    return this.propertiesService.addAmenity(id, addPropertyAmenityDto);
  }

  @Get(':id/amenities')
  getAmenities(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.getAmenities(id);
  }

  @Delete('amenities/:propertyAmenityId')
  removeAmenity(
    @Param('propertyAmenityId', ParseIntPipe) propertyAmenityId: number,
  ) {
    return this.propertiesService.removeAmenity(propertyAmenityId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(id, updatePropertyDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.remove(id);
  }
}
