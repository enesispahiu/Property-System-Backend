import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/jwt-payload.type';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers(currentUser: JwtPayload) {
    return this.prisma.user.findMany({
      where: { tenantId: currentUser.tenantId },
      select: {
        id: true,
        email: true,
        tenantId: true,
        roleId: true,
        role: { select: { name: true } },
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getUserById(id: number, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        tenantId: true,
        roleId: true,
        role: { select: { name: true } },
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('You cannot access users from other tenants');
    }

    return user;
  }

  async updateUser(id: number, dto: UpdateUserDto, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('You cannot update users from other tenants');
    }

    if (currentUser.role !== 'ADMIN' && id !== currentUser.sub) {
      throw new ForbiddenException('You can only update your own profile');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
      },
      select: {
        id: true,
        email: true,
        tenantId: true,
        roleId: true,
        role: { select: { name: true } },
        createdAt: true,
      },
    });
  }

  async deleteUser(id: number, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can delete users');
    }

    if (user.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('You cannot delete users from other tenants');
    }

    if (id === currentUser.sub) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });

    return this.prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
        tenantId: true,
        createdAt: true,
      },
    });
  }

  async updateUserRole(
    id: number,
    dto: UpdateUserRoleDto,
    currentUser: JwtPayload,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can change user roles');
    }

    if (user.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('You cannot change roles for users from other tenants');
    }

    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new BadRequestException(`Role with ID ${dto.roleId} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { roleId: dto.roleId },
      select: {
        id: true,
        email: true,
        tenantId: true,
        roleId: true,
        role: { select: { name: true } },
        createdAt: true,
      },
    });
  }
}
