import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AnalyzeReviewDto {
  @ApiProperty({ example: 'The apartment was clean and the host was helpful.' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiPropertyOptional({ example: 'Legacy review text field' })
  @IsOptional()
  @IsString()
  reviewText?: string;
}
