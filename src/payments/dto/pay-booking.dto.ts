import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export class PayBookingDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CARD })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}
