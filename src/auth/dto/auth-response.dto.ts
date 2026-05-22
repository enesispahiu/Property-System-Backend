import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'tenant@example.com' })
  email: string;

  @ApiProperty({ example: 1 })
  roleId: number;

  @ApiProperty({ example: 'TENANT' })
  role: string;

  @ApiProperty({ example: 1 })
  tenantId: number;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'access.jwt.token' })
  accessToken: string;

  @ApiProperty({ example: 'refresh.jwt.token' })
  refreshToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
