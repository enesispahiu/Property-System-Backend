import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Modern apartment near city center' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Two-bedroom apartment with balcony and parking.' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 145.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'Warsaw, Poland' })
  @IsString()
  location!: string;

  @ApiPropertyOptional({ example: 'AVAILABLE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  tenantId!: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  ownerId!: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  categoryId?: number;
}
