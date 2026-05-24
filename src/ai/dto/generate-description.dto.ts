import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class GenerateDescriptionDto {
  @ApiProperty({ example: 'Modern Apartment' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Prishtina' })
  @IsString()
  location: string;

  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'Apartment' })
  @IsOptional()
  @IsString()
  propertyType?: string;

  @ApiPropertyOptional({ example: ['Wi-Fi', 'Parking'] })
  @IsOptional()
  @IsArray()
  amenities?: string[];
}
