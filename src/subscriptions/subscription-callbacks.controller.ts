import { Controller, Get, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('subscription')
@ApiExcludeController() // Hide from Swagger documentation
export class SubscriptionCallbacksController {
  @Get('success')
  async checkoutSuccess(@Req() req) {
    const sessionId = req.query.session_id;

    return {
      success: true,
      message: 'Payment completed successfully!',
      sessionId,
      note: 'Your payment has been processed. The webhook will update your subscription status shortly.',
    };
  }

  @Get('cancel')
  async checkoutCancel() {
    return {
      success: false,
      message: 'Payment was cancelled',
      note: 'You can try again by creating a new checkout session.',
    };
  }
}
