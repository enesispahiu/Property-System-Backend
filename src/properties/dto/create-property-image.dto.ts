import { IsString } from 'class-validator';

export class CreatePropertyImageDto {
  @IsString()
  url!: string;
}
