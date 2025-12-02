import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ 
    example: 'price_1234567890',
    description: 'Stripe Price ID for the subscription plan'
  })
  @IsString()
  @IsNotEmpty()
  priceId: string;
}
