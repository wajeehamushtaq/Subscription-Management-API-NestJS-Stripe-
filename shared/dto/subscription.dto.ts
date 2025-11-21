import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ 
    example: 'price_1234567890',
    description: 'Stripe Price ID for the subscription plan'
  })
  priceId: string;
}
