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
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

const bookingExample = {
  id: 12,
  startDate: '2026-06-01T00:00:00.000Z',
  endDate: '2026-06-05T00:00:00.000Z',
  status: 'PENDING',
  totalPrice: 582,
  userId: 1,
  propertyId: 10,
  createdAt: '2026-05-22T20:00:00.000Z',
  updatedAt: '2026-05-22T20:00:00.000Z',
};

@Controller('bookings')
@ApiTags('Bookings')
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking' })
  @ApiBody({ type: CreateBookingDto })
  @ApiCreatedResponse({ schema: { example: bookingExample } })
  @ApiResponse({
    status: 400,
    description: 'Invalid dates or overlapping booking',
  })
  @ApiNotFoundResponse({ description: 'Property not found' })
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all bookings' })
  @ApiOkResponse({ schema: { example: [bookingExample] } })
  findAll() {
    return this.bookingsService.findAll();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'List bookings for a user' })
  @ApiOkResponse({ schema: { example: [bookingExample] } })
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.bookingsService.findByUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiOkResponse({ schema: { example: bookingExample } })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a booking' })
  @ApiBody({ type: UpdateBookingDto })
  @ApiOkResponse({ schema: { example: bookingExample } })
  @ApiResponse({ status: 400, description: 'Invalid booking update' })
  @ApiNotFoundResponse({ description: 'Booking or property not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(id, updateBookingDto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiOkResponse({
    schema: { example: { ...bookingExample, status: 'CANCELLED' } },
  })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.cancel(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a booking' })
  @ApiOkResponse({
    schema: { example: { ...bookingExample, status: 'CONFIRMED' } },
  })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  confirm(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.confirm(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a booking' })
  @ApiOkResponse({ schema: { example: bookingExample } })
  @ApiNotFoundResponse({ description: 'Booking not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.remove(id);
  }
}
