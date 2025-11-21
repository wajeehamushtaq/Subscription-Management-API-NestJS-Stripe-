import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2025-11-17.clover',
      },
    );
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
      });
      this.logger.log(`Stripe customer created: ${customer.id} for ${email}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create Stripe customer for ${email}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a checkout session for one-time payment
   */
  async createCheckoutSession(
    priceId: string,
    customerId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment', // One-time payment
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_intent_data: {
          setup_future_usage: 'off_session', // Optional: save payment method for future use
        },
      });
      this.logger.log(`Checkout session created: ${session.id} for customer ${customerId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create checkout session for customer ${customerId}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieve subscription details
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      this.logger.error(`Failed to retrieve subscription ${subscriptionId}`, error.stack);
      throw error;
    }
  }

  /**
   * Get line items from a checkout session
   */
  async getCheckoutLineItems(sessionId: string): Promise<Stripe.LineItem[]> {
    try {
      const lineItems = await this.stripe.checkout.sessions.listLineItems(sessionId);
      return lineItems.data;
    } catch (error) {
      this.logger.error(`Failed to retrieve line items for session ${sessionId}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      this.logger.log(`Subscription cancelled: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription ${subscriptionId}`, error.stack);
      throw error;
    }
  }

  /**
   * List all products (plans) from Stripe
   */
  async listProducts(): Promise<Stripe.Product[]> {
    try {
      const products = await this.stripe.products.list({
        active: true,
        expand: ['data.default_price'],
      });
      return products.data;
    } catch (error) {
      this.logger.error('Failed to list Stripe products', error.stack);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error.stack);
      throw error;
    }
  }
}
