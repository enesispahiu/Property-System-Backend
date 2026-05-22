import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AddPropertyAmenityDto {
  @ApiProperty({ example: 4 })
  @IsInt()
  amenityId!: number;
}
