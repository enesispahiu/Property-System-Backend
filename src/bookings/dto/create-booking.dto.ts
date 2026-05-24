import { IsDateString, IsInt } from 'class-validator';

export class CreateBookingDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsInt()
  propertyId!: number;
}
