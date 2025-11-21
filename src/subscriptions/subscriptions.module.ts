import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionCallbacksController } from './subscription-callbacks.controller';
import { Subscription, SubscriptionSchema, User, UserSchema } from '@shared/schemas';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => StripeModule),
  ],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController, SubscriptionCallbacksController],
  exports: [SubscriptionsService, MongooseModule],
})
export class SubscriptionsModule {}
