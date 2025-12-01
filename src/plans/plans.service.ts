import { Injectable, Logger } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';

export interface PlanSummary {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, any>;
  isActive: boolean;
  price: null | {
    id: string;
    amount: number;
    currency: string;
    interval?: string;
    displayAmount: string;
    isActive: boolean;
  };
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private stripeService: StripeService) {}

  async getPlans(): Promise<PlanSummary[]> {
    try {
      const products = await this.stripeService.listProducts();

      return products.map((product) => {
        const defaultPrice = product.default_price as any;
        const amount = defaultPrice?.unit_amount || 0;
        const currency = defaultPrice?.currency || 'usd';

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          isActive: product.active,
          price: defaultPrice
            ? {
                id: defaultPrice.id,
                amount,
                currency,
                interval: defaultPrice.recurring?.interval,
                displayAmount: this.formatCurrency(amount, currency),
                isActive: defaultPrice.active !== false,
              }
            : null,
        } as PlanSummary;
      });
    } catch (error) {
      this.logger.error('Failed to fetch plans from Stripe', error.stack);
      throw error;
    }
  }

  async getPlanByPriceId(priceId: string): Promise<PlanSummary | null> {
    const plans = await this.getPlans();
    const match = plans.find(
      (plan) =>
        plan.isActive &&
        plan.price?.id === priceId &&
        plan.price.isActive,
    );
    return match || null;
  }

  private formatCurrency(amountInCents: number, currency: string): string {
    const amountInDollars = amountInCents / 100;
    const currencySymbol =
      currency.toLowerCase() === 'usd' ? '$' : currency.toUpperCase();
    return `${currencySymbol}${amountInDollars.toFixed(2)}`;
  }
}
