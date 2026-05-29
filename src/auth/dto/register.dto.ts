import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tenantName?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsInt()
  @Min(1)
  tenantId?: number;

  @ApiHideProperty()
  @IsOptional()
  @IsInt()
  @Min(1)
  roleId?: number;
}
