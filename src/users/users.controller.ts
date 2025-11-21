import { Controller, Get, UseGuards, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private usersService: UsersService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllUsers(@Req() req) {
    this.logger.log(`Admin ${req.user.email} requested all users list`);
    const users = await this.usersService.findAll();
    this.logger.log(`Returned ${users.length} users to admin ${req.user.email}`);
    return users;
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all subscriptions' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllSubscriptions(@Req() req) {
    this.logger.log(`Admin ${req.user.email} requested all subscriptions list`);
    const subscriptions = await this.subscriptionsService.findAll();
    this.logger.log(`Returned ${subscriptions.length} subscriptions to admin ${req.user.email}`);
    return subscriptions;
  }
}
