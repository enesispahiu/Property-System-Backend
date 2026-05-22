import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePropertyImageDto {
  @ApiProperty({
    example: 'https://cdn.example.com/properties/1/living-room.jpg',
  })
  @IsString()
  url!: string;
}
