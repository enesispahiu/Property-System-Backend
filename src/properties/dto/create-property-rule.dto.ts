import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePropertyRuleDto {
  @ApiProperty({ example: 'No smoking' })
  @IsString()
  @MaxLength(80)
  title!: string;

  @ApiPropertyOptional({ example: 'Smoking is not allowed indoors.' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;
}
