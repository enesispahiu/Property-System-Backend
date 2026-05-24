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
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.type';

@Controller('bookings')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiTags('Bookings')
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking for the authenticated user' })
  create(
    @Body() createBookingDto: CreateBookingDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.bookingsService.create(createBookingDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'List tenant bookings, scoped by role' })
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.bookingsService.findAll(currentUser);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'List bookings for a user' })
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.bookingsService.findByUser(userId, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one booking by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.bookingsService.findOne(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a booking' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.bookingsService.update(id, updateBookingDto, currentUser);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.bookingsService.cancel(id, currentUser);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a booking' })
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.bookingsService.confirm(id, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a booking' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.bookingsService.remove(id, currentUser);
  }
}
