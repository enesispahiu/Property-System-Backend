import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-06-05T00:00:00.000Z' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  userId!: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  propertyId!: number;
}
