import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'newemail@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}
