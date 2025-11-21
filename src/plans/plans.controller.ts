import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlansService } from './plans.service';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  private readonly logger = new Logger(PlansController.name);

  constructor(private plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available subscription plans' })
  @ApiResponse({ status: 200, description: 'List of plans fetched from Stripe' })
  async getPlans() {
    this.logger.log('Fetching available plans');
    const plans = await this.plansService.getPlans();
    this.logger.log(`Returned ${plans.length} plans`);
    return plans;
  }
}
