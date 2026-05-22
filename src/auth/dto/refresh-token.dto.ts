import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'refresh.jwt.token' })
  @IsString()
  @MinLength(20)
  refreshToken: string;
}
