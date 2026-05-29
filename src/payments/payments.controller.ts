import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.type';
import { PayBookingDto } from './dto/pay-booking.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiTags('Payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('bookings/:bookingId/pay')
  @ApiOperation({ summary: 'Pay for an authenticated user booking' })
  @ApiParam({ name: 'bookingId', type: Number })
  @ApiBody({ type: PayBookingDto })
  @ApiResponse({ status: 201, description: 'Payment completed or already paid' })
  @ApiResponse({ status: 400, description: 'Invalid payment request' })
  @ApiResponse({ status: 403, description: 'Booking belongs to another user' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  payBooking(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() dto: PayBookingDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.paymentsService.payBooking(bookingId, dto, currentUser);
  }
}
