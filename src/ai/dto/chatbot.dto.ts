import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ChatbotDto {
  @ApiProperty({ example: 'Which properties are available in Prishtina?' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
