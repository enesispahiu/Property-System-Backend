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
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CreatePropertyImageDto } from './dto/create-property-image.dto';
import { AddPropertyAmenityDto } from './dto/add-property-amenity.dto';

const propertyExample = {
  id: 10,
  title: 'Modern apartment near city center',
  description: 'Two-bedroom apartment with balcony and parking.',
  price: 145.5,
  location: 'Warsaw, Poland',
  status: 'AVAILABLE',
  tenantId: 1,
  ownerId: 2,
  categoryId: 3,
  createdAt: '2026-05-22T20:00:00.000Z',
  updatedAt: '2026-05-22T20:00:00.000Z',
};

@Controller('properties')
@ApiTags('Properties')
@ApiBearerAuth()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a property' })
  @ApiBody({ type: CreatePropertyDto })
  @ApiCreatedResponse({ schema: { example: propertyExample } })
  @ApiResponse({ status: 400, description: 'Invalid property payload' })
  create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertiesService.create(createPropertyDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all properties' })
  @ApiOkResponse({ schema: { example: [propertyExample] } })
  findAll() {
    return this.propertiesService.findAll();
  }

  @Post(':id/images')
  @ApiOperation({ summary: 'Add an image to a property' })
  @ApiBody({ type: CreatePropertyImageDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        id: 3,
        url: 'https://cdn.example.com/properties/1/living-room.jpg',
        propertyId: 10,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  addImage(
    @Param('id', ParseIntPipe) id: number,
    @Body() createPropertyImageDto: CreatePropertyImageDto,
  ) {
    return this.propertiesService.addImage(id, createPropertyImageDto);
  }

  @Get(':id/images')
  @ApiOperation({ summary: 'List property images' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 3,
          url: 'https://cdn.example.com/properties/1/living-room.jpg',
          propertyId: 10,
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  getImages(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.getImages(id);
  }

  @Delete('images/:imageId')
  @ApiOperation({ summary: 'Remove a property image' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 3,
        url: 'https://cdn.example.com/properties/1/living-room.jpg',
        propertyId: 10,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Property image not found' })
  removeImage(@Param('imageId', ParseIntPipe) imageId: number) {
    return this.propertiesService.removeImage(imageId);
  }

  @Post(':id/amenities')
  @ApiOperation({ summary: 'Add an amenity to a property' })
  @ApiBody({ type: AddPropertyAmenityDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        id: 7,
        propertyId: 10,
        amenityId: 4,
        amenity: { id: 4, name: 'Wi-Fi' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Amenity already assigned' })
  @ApiNotFoundResponse({ description: 'Property or amenity not found' })
  addAmenity(
    @Param('id', ParseIntPipe) id: number,
    @Body() addPropertyAmenityDto: AddPropertyAmenityDto,
  ) {
    return this.propertiesService.addAmenity(id, addPropertyAmenityDto);
  }

  @Get(':id/amenities')
  @ApiOperation({ summary: 'List property amenities' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 7,
          propertyId: 10,
          amenityId: 4,
          amenity: { id: 4, name: 'Wi-Fi' },
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  getAmenities(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.getAmenities(id);
  }

  @Delete('amenities/:propertyAmenityId')
  @ApiOperation({ summary: 'Remove an amenity from a property' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 7,
        propertyId: 10,
        amenityId: 4,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Property amenity not found' })
  removeAmenity(
    @Param('propertyAmenityId', ParseIntPipe) propertyAmenityId: number,
  ) {
    return this.propertiesService.removeAmenity(propertyAmenityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a property by ID' })
  @ApiOkResponse({ schema: { example: propertyExample } })
  @ApiNotFoundResponse({ description: 'Property not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a property' })
  @ApiBody({ type: UpdatePropertyDto })
  @ApiOkResponse({ schema: { example: propertyExample } })
  @ApiNotFoundResponse({ description: 'Property not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(id, updatePropertyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a property' })
  @ApiOkResponse({ schema: { example: propertyExample } })
  @ApiNotFoundResponse({ description: 'Property not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.propertiesService.remove(id);
  }
}
