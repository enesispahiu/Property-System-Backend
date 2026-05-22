import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Clean apartment, responsive host, great location.' })
  @IsString()
  comment: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  propertyId: number;
}
