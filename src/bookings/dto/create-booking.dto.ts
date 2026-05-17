import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsInt()
  userId!: number;

  @IsInt()
  propertyId!: number;
}
