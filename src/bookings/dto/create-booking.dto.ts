import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateBookingGuestDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiPropertyOptional({ example: 31 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;
}

export class CreateBookingDto {
  @ApiProperty({ example: '2026-06-15' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-06-18' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  propertyId!: number;

  @ApiPropertyOptional({ example: 2, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  guestCount?: number;

  @ApiPropertyOptional({ type: [CreateBookingGuestDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBookingGuestDto)
  guests?: CreateBookingGuestDto[];
}
