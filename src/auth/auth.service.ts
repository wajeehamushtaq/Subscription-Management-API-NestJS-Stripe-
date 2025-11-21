import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, Role } from '@shared/schemas';
import { SignUpDto, SignInDto, AuthResponseDto } from '@shared/dto';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    private stripeService: StripeService,
  ) {}

  async signUp(dto: SignUpDto): Promise<AuthResponseDto> {
    this.logger.log(`Signup attempt for email: ${dto.email}`);

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      this.logger.warn(`Signup failed: User already exists - ${dto.email}`);
      throw new BadRequestException('User already exists');
    }

    // Get default 'user' role
    const userRole = await this.roleModel.findOne({ name: 'user' });
    if (!userRole) {
      this.logger.error('Default user role not found in database');
      throw new BadRequestException('Default user role not found');
    }

    // Create Stripe customer
    const stripeCustomer = await this.stripeService.createCustomer(
      dto.email,
      dto.full_name,
    );

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.userModel.create({
      email: dto.email,
      password: hashedPassword,
      full_name: dto.full_name,
      role: userRole._id,
      stripeCustomerId: stripeCustomer.id,
    });

    // Populate role
    await user.populate('role');

    this.logger.log(`User successfully registered: ${dto.email}`);
    return this.generateTokenResponse(user);
  }

  async signIn(dto: SignInDto): Promise<AuthResponseDto> {
    this.logger.log(`Signin attempt for email: ${dto.email}`);

    // Find user
    const user = await this.userModel.findOne({ email: dto.email }).populate('role');
    if (!user) {
      this.logger.warn(`Signin failed: User not found - ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Signin failed: Invalid password - ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User successfully signed in: ${dto.email}`);
    return this.generateTokenResponse(user);
  }

  private generateTokenResponse(user: any): AuthResponseDto {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      role: user.role.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        role: user.role.name,
      },
    };
  }
}
