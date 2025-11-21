import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription } from '@shared/schemas';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,
  ) {}

  async create(createData: Partial<Subscription>): Promise<Subscription> {
    return this.subscriptionModel.create(createData);
  }

  async findByUserId(userId: string): Promise<Subscription | null> {
    return this.subscriptionModel
      .findOne({ userId, status: 'completed' })
      .populate('userId', 'email full_name')
      .sort({ paidAt: -1 }) // Get most recent payment
      .exec();
  }

  async findByPaymentIntentId(
    stripePaymentIntentId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionModel
      .findOne({ stripePaymentIntentId })
      .exec();
  }

  async findAll(): Promise<Subscription[]> {
    return this.subscriptionModel
      .find()
      .populate('userId', 'email full_name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(
    stripePaymentIntentId: string,
    status: string,
    additionalData?: Partial<Subscription>,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionModel.findOneAndUpdate(
      { stripePaymentIntentId },
      { status, ...additionalData },
      { new: true },
    );

    if (!subscription) {
      throw new NotFoundException('Payment record not found');
    }

    return subscription;
  }

  async cancel(stripePaymentIntentId: string): Promise<Subscription> {
    return this.updateStatus(stripePaymentIntentId, 'cancelled', {
      cancelledAt: new Date(),
    });
  }

  async hasActivePayment(userId: string): Promise<boolean> {
    const count = await this.subscriptionModel.countDocuments({
      userId,
      status: 'completed',
    });
    return count > 0;
  }
}
