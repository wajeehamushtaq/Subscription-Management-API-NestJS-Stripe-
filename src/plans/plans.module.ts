import { Module, forwardRef } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [forwardRef(() => StripeModule)],
  providers: [PlansService],
  controllers: [PlansController],
  exports: [PlansService],
})
export class PlansModule {}
