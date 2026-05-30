import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.type';
import { InvoicesService } from './invoices.service';

@Controller()
@UseGuards(JwtAuthGuard)
@ApiTags('Invoices')
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('invoices/me')
  @ApiOperation({ summary: 'List invoices visible to the current user' })
  findMine(@CurrentUser() currentUser: JwtPayload) {
    return this.invoicesService.findMine(currentUser);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get one invoice by ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invoicesService.findOne(id, currentUser);
  }

  @Get('bookings/:bookingId/invoice')
  @ApiOperation({ summary: 'Get invoice for a booking' })
  findByBooking(
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invoicesService.findByBooking(bookingId, currentUser);
  }
}
