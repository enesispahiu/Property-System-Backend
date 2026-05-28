import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Roles as AppRoles } from '../auth/roles';
import { PlatformService } from './platform.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantAdminDto } from './dto/create-tenant-admin.dto';

@ApiTags('Platform')
@ApiBearerAuth()
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRoles.SUPER_ADMIN)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List active tenants for the platform owner' })
  findTenants(@Query('includeInactive') includeInactive?: string) {
    return this.platformService.findTenants({
      includeInactive: includeInactive === 'true',
    });
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Create a tenant' })
  createTenant(@Body() dto: CreateTenantDto) {
    return this.platformService.createTenant(dto);
  }

  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get one tenant' })
  findTenant(@Param('id', ParseIntPipe) id: number) {
    return this.platformService.findTenant(id);
  }

  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Update tenant settings' })
  updateTenant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.platformService.updateTenant(id, dto);
  }

  @Delete('tenants/:id')
  @ApiOperation({ summary: 'Delete an empty tenant' })
  deleteTenant(@Param('id', ParseIntPipe) id: number) {
    return this.platformService.deleteTenant(id);
  }

  @Patch('tenants/:id/deactivate')
  @ApiOperation({
    summary: 'Deactivate/archive a tenant without deleting related data',
  })
  deactivateTenant(@Param('id', ParseIntPipe) id: number) {
    return this.platformService.deactivateTenant(id);
  }

  @Patch('tenants/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate an archived tenant' })
  reactivateTenant(@Param('id', ParseIntPipe) id: number) {
    return this.platformService.reactivateTenant(id);
  }

  @Post('tenants/:id/admins')
  @ApiOperation({ summary: 'Create a tenant admin account for a tenant' })
  createTenantAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateTenantAdminDto,
  ) {
    return this.platformService.createTenantAdmin(id, dto);
  }
}
