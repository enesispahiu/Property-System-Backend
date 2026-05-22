import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePropertyDto {
  @ApiPropertyOptional({ example: 'Updated modern apartment' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description with new amenities.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 160, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'Krakow, Poland' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'AVAILABLE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  tenantId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  ownerId?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  categoryId?: number;
}
