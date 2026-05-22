import {
  Controller,
  Get,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtPayload } from '../auth/jwt-payload.type';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (tenant-aware)' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          email: 'user@example.com',
          tenantId: 1,
          roleId: 2,
          role: { name: 'TENANT' },
          createdAt: '2026-05-22T20:00:00Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  getAllUsers(@CurrentUser() user: JwtPayload) {
    return this.usersService.getAllUsers(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user by ID' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        tenantId: 1,
        roleId: 2,
        role: { name: 'TENANT' },
        createdAt: '2026-05-22T20:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse({
    description: 'Cannot access users from other tenants',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  getUserById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.getUserById(id, user);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update user (own profile or admin can update any)',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        email: 'newemail@example.com',
        tenantId: 1,
        roleId: 2,
        role: { name: 'TENANT' },
        createdAt: '2026-05-22T20:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse({ description: 'Cannot update other users' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateUser(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete user (admin only)' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        tenantId: 1,
        createdAt: '2026-05-22T20:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse({ description: 'Only admins can delete users' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.deleteUser(id, user);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user role (admin only)' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        tenantId: 1,
        roleId: 3,
        role: { name: 'ADMIN' },
        createdAt: '2026-05-22T20:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User or role not found' })
  @ApiForbiddenResponse({ description: 'Only admins can change user roles' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateUserRole(id, dto, user);
  }
}
