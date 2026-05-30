import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAvailabilityDto {
  @ApiProperty({ example: '2026-07-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-07-05' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: 'Owner maintenance' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  reason?: string;
}
