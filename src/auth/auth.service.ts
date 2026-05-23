import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './jwt-payload.type';

type UserWithRole = {
  id: number;
  email: string;
  password: string;
  tenantId: number;
  roleId: number;
  role: { id: number; name: string };
};

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    this.accessSecret =
      configService.get<string>('JWT_ACCESS_SECRET') ?? jwtSecret ?? 'dev-jwt-secret';
    this.refreshSecret =
      configService.get<string>('JWT_REFRESH_SECRET') ?? jwtSecret ?? 'dev-jwt-secret';
  }

  async register(dto: RegisterDto) {
    if (!dto.tenantId && !dto.tenantName) {
      throw new BadRequestException('tenantId or tenantName is required');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const tenant = dto.tenantId
      ? await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } })
      : await this.prisma.tenant.create({ data: { name: dto.tenantName! } });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const role = dto.roleId
      ? await this.prisma.role.findUnique({ where: { id: dto.roleId } })
      : await this.prisma.role.findFirst({ where: { name: 'TENANT' } });

    const resolvedRole =
      role ?? (await this.prisma.role.create({ data: { name: 'TENANT' } }));

    const password = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password,
        tenantId: tenant.id,
        roleId: resolvedRole.id,
      },
      include: { role: true },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokens(user);
  }

  async logout(dto: RefreshTokenDto) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: dto.refreshToken },
    });

    return { message: 'Logged out successfully' };
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
    });

    if (!storedToken || storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.prisma.refreshToken.delete({
      where: { token: dto.refreshToken },
    });

    return this.issueTokens(user);
  }

  getMe(user: JwtPayload) {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      roleId: user.roleId,
      tenantId: user.tenantId,
    };
  }

  private async issueTokens(user: UserWithRole) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      role: user.role.name,
      tenantId: user.tenantId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload, jti: randomUUID() }, {
        secret: this.accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync({ ...payload, jti: randomUUID() }, {
        secret: this.refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roleId: user.roleId,
        role: user.role.name,
        tenantId: user.tenantId,
      },
    };
  }
}
