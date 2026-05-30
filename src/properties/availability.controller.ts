import { Controller, Delete, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles as AppRoles } from '../auth/roles';
import type { JwtPayload } from '../auth/jwt-payload.type';
import { PropertiesService } from './properties.service';

@Controller('availability')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(AppRoles.TENANT_ADMIN, AppRoles.SUPER_ADMIN)
@ApiTags('Availability')
@ApiBearerAuth()
export class AvailabilityController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a blocked property date range' })
  removeAvailability(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.propertiesService.removeAvailability(id, currentUser);
  }
}
