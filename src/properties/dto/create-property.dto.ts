import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  location!: string;

  @IsInt()
  tenantId!: number;

  @IsInt()
  ownerId!: number;

  @IsOptional()
  @IsInt()
  categoryId?: number;
}
