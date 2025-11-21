import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

@Schema({ timestamps: true })
export class Subscription extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: User;

  @Prop({ required: true })
  planId: string; // Stripe Product ID

  @Prop({ required: true })
  priceId: string; // Stripe Price ID

  @Prop({ required: true })
  stripePaymentIntentId: string; // Stripe PaymentIntent ID for one-time payments

  @Prop({
    default: 'pending',
    enum: ['pending', 'completed', 'failed', 'cancelled'],
  })
  status: string;

  @Prop()
  amount: number; // Amount paid in cents

  @Prop()
  currency: string; // Currency code (e.g., 'usd')

  @Prop()
  paidAt?: Date; // When payment was completed

  @Prop()
  cancelledAt?: Date;

  @Prop({ type: Map, of: String })
  metadata?: Map<string, any>; // billing address, payment method, etc.
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Configure JSON transformation to exclude internal fields
SubscriptionSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret._id;
    ret.id = doc._id.toString();
    return ret;
  },
});

// Index for efficient queries
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ stripePaymentIntentId: 1 });
