import { IsInt } from 'class-validator';

export class AddPropertyAmenityDto {
  @IsInt()
  amenityId!: number;
}
