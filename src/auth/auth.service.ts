import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, Role } from '@shared/schemas';
import { SignUpDto, SignInDto, AuthResponseDto, RefreshTokenDto } from '@shared/dto';
import { StripeService } from '../stripe/stripe.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenTTL = '15m';
  private readonly refreshTokenTTL = '7d';
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;

  constructor(
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
    private stripeService: StripeService,
    private configService: ConfigService,
  ) {
    this.accessTokenSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      this.configService.get<string>('JWT_SECRET');
    this.refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      this.configService.get<string>('JWT_SECRET');
  }

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
    return this.buildAuthResponse(user);
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
    return this.buildAuthResponse(user);
  }

  async refreshTokens(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const { refreshToken } = dto;

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.refreshTokenSecret,
      });
    } catch (error) {
      this.logger.warn('Invalid refresh token signature');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userModel.findById(payload.sub).populate('role');
    if (!user || !user.refreshTokenHash) {
      this.logger.warn(`Refresh failed: user not found or no token stored`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!tokenMatches) {
      this.logger.warn(`Refresh failed: token mismatch for user ${user.id}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.logger.log(`Refresh token rotation for user: ${user.email}`);
    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: any): Promise<AuthResponseDto> {
    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user._id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        role: user.role.name,
      },
    };
  }

  private generateTokens(user: any) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      role: user.role.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenTTL,
      secret: this.accessTokenSecret,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.refreshTokenTTL,
      secret: this.refreshTokenSecret,
    });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userModel.updateOne(
      { _id: userId },
      { refreshTokenHash: hash },
      { upsert: false },
    );
  }
}
