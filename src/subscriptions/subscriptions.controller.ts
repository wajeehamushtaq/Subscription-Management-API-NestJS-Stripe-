import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from '../stripe/stripe.service';
import { CreateCheckoutDto } from '@shared/dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '@shared/schemas';
import { Model } from 'mongoose';

@ApiTags('Subscriptions')
@Controller('subscription')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private subscriptionsService: SubscriptionsService,
    private stripeService: StripeService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create Stripe checkout session for one-time payment' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  @ApiResponse({ status: 400, description: 'User already has completed payment' })
  @ApiResponse({ status: 404, description: 'User or Stripe customer not found' })
  async createCheckout(@Body() dto: CreateCheckoutDto, @Req() req) {
    const userId = req.user.id;
    this.logger.log(`Checkout initiated by user: ${userId}`);

    // Check if user already has a completed payment
    const hasPayment = await this.subscriptionsService.hasActivePayment(userId);
    if (hasPayment) {
      this.logger.warn(`Checkout failed: User ${userId} already has completed payment`);
      throw new BadRequestException('User already has a completed payment');
    }

    // Get user's Stripe customer ID
    const user = await this.userModel.findById(userId);
    if (!user || !user.stripeCustomerId) {
      this.logger.error(`Checkout failed: User ${userId} or Stripe customer not found`);
      throw new NotFoundException('User or Stripe customer not found');
    }

    // Create checkout session with backend callback URLs
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/subscription/cancel`;

    const session = await this.stripeService.createCheckoutSession(
      dto.priceId,
      user.stripeCustomerId,
      successUrl,
      cancelUrl,
    );

    this.logger.log(`Checkout session created for user ${userId}: ${session.id}`);
    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user payment record' })
  @ApiResponse({ status: 200, description: 'Payment details or null if no payment' })
  async getSubscription(@Req() req) {
    const userId = req.user.id;
    this.logger.log(`Get subscription request from user: ${userId}`);

    const subscription = await this.subscriptionsService.findByUserId(userId);

    if (!subscription) {
      this.logger.log(`No subscription found for user: ${userId}`);
      return null;
    }

    return subscription;
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel payment' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  @ApiResponse({ status: 404, description: 'No completed payment found' })
  async cancelSubscription(@Req() req) {
    const userId = req.user.id;
    this.logger.log(`Cancel payment request from user: ${userId}`);

    // Get user's payment record
    const subscription = await this.subscriptionsService.findByUserId(userId);
    if (!subscription) {
      this.logger.warn(`Cancel failed: No completed payment found for user ${userId}`);
      throw new NotFoundException('No completed payment found');
    }

    // Mark as cancelled in DB
    await this.subscriptionsService.cancel(subscription.stripePaymentIntentId);

    this.logger.log(`Payment cancelled successfully for user: ${userId}`);
    return {
      message: 'Payment cancelled successfully',
    };
  }
}
