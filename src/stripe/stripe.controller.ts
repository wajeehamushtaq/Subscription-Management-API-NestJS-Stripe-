import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { User } from '@shared/schemas';
import Stripe from 'stripe';

@Controller('stripe')
@ApiExcludeController() // Hide webhook from Swagger - only for Stripe to call
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private stripeService: StripeService,
    private subscriptionsService: SubscriptionsService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;

    try {
      // Get raw body for signature verification (set in main.ts middleware)
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
      event = this.stripeService.verifyWebhookSignature(rawBody, signature);
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error.stack);
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Received webhook event: ${event.type}`);

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook event ${event.type}`, error.stack);
      // Return 200 to prevent Stripe from retrying
      return { received: true, error: error.message };
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    this.logger.log(`Processing checkout.session.completed: ${session.id}`);

    const paymentIntentId = session.payment_intent as string;
    if (!paymentIntentId) {
      this.logger.warn('No payment intent found in checkout session');
      return;
    }

    const customerId = session.customer as string;
    
    // Get line items to extract price and product info
    const lineItems = await this.stripeService.getCheckoutLineItems(session.id);
    if (!lineItems || lineItems.length === 0) {
      this.logger.warn('No line items found in checkout session');
      return;
    }

    const priceId = lineItems[0].price?.id;
    const productId = lineItems[0].price?.product as string;
    const amount = session.amount_total || 0;
    const currency = session.currency || 'usd';

    // Find user by Stripe customer ID
    const user = await this.userModel.findOne({ 
      stripeCustomerId: customerId 
    });

    if (!user) {
      this.logger.error(`User not found for Stripe customer ${customerId}`);
      return;
    }

    // Create payment record
    await this.subscriptionsService.create({
      userId: user._id.toString() as any,
      planId: productId,
      priceId,
      stripePaymentIntentId: paymentIntentId,
      status: 'completed',
      amount,
      currency,
      paidAt: new Date(),
    });

    this.logger.log(`Payment recorded for user ${user.email}: ${paymentIntentId}`);
  }

  private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment succeeded for intent: ${paymentIntent.id}`);
    
    // Update payment status if it exists
    const existing = await this.subscriptionsService.findByPaymentIntentId(paymentIntent.id);
    if (existing) {
      await this.subscriptionsService.updateStatus(paymentIntent.id, 'completed', {
        paidAt: new Date(),
      });
    }
  }

  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.error(`Payment failed for intent: ${paymentIntent.id}`);
    
    // Update payment status if it exists
    const existing = await this.subscriptionsService.findByPaymentIntentId(paymentIntent.id);
    if (existing) {
      await this.subscriptionsService.updateStatus(paymentIntent.id, 'failed');
    }
  }
}
