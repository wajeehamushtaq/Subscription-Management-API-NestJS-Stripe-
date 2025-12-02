import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, Role } from '@shared/schemas';
import { StripeService } from '../stripe/stripe.service';
import { ConfigService } from '@nestjs/config';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let roleModel: any;
  let jwtService: JwtService;
  let stripeService: StripeService;
  let configService: ConfigService;
  let bcryptCompareSpy: jest.SpyInstance;
  let bcryptHashSpy: jest.SpyInstance;

  const mockUserRole = {
    _id: 'role123',
    name: 'user',
    status: 'active',
  };

  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    full_name: 'Test User',
    role: mockUserRole,
    stripeCustomerId: 'cus_test123',
    refreshTokenHash: 'hashedRefresh',
    populate: jest.fn().mockResolvedValue({
      _id: 'user123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: mockUserRole,
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            updateOne: jest.fn().mockResolvedValue(undefined),
            findById: jest.fn(),
          },
        },
        {
          provide: getModelToken(Role.name),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: StripeService,
          useValue: {
            createCustomer: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'JWT_ACCESS_SECRET':
                  return 'access-secret';
                case 'JWT_REFRESH_SECRET':
                  return 'refresh-secret';
                case 'JWT_SECRET':
                  return 'default-secret';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    roleModel = module.get(getModelToken(Role.name));
    jwtService = module.get<JwtService>(JwtService);
    stripeService = module.get<StripeService>(StripeService);
    configService = module.get<ConfigService>(ConfigService);
    bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');
    bcryptHashSpy = jest.spyOn(bcrypt, 'hash');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('signUp', () => {
    const signUpDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      full_name: 'New User',
    };

    it('should create a new user successfully', async () => {
      userModel.findOne.mockResolvedValue(null);
      roleModel.findOne.mockResolvedValue(mockUserRole);
      userModel.create.mockResolvedValue(mockUser);

      const result = await service.signUp(signUpDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
      expect(stripeService.createCustomer).toHaveBeenCalledWith(
        signUpDto.email,
        signUpDto.full_name,
      );
    });

    it('should throw BadRequestException if user already exists', async () => {
      userModel.findOne.mockResolvedValue(mockUser);

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        'User already exists',
      );
    });

    it('should throw BadRequestException if user role not found', async () => {
      userModel.findOne.mockResolvedValue(null);
      roleModel.findOne.mockResolvedValue(null);

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        'Default user role not found',
      );
    });

    it('should hash password before saving', async () => {
      userModel.findOne.mockResolvedValue(null);
      roleModel.findOne.mockResolvedValue(mockUserRole);
      userModel.create.mockResolvedValue(mockUser);

      await service.signUp(signUpDto);

      expect(bcryptHashSpy).toHaveBeenCalledWith(signUpDto.password, 10);
      expect(userModel.updateOne).toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    const signInDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should sign in user with valid credentials', async () => {
      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });
      bcryptCompareSpy.mockResolvedValue(true as never);

      const result = await service.signIn(signInDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
      expect(userModel.updateOne).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });
      bcryptCompareSpy.mockResolvedValue(false as never);

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn(signInDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('generateTokenResponse', () => {
    it('should generate access and refresh tokens', async () => {
      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockUser),
      });
      bcryptCompareSpy.mockResolvedValue(true as never);

      const result = await service.signIn({
        email: 'test@example.com',
        password: 'Password123!',
      });

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });
  });

  describe('refreshTokens', () => {
    it('should issue new tokens when refresh token is valid', async () => {
      const refreshToken = 'valid-refresh';
      jwtService.verify = jest.fn().mockReturnValue({ sub: mockUser._id });
      userModel.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          ...mockUser,
          refreshTokenHash: 'stored-hash',
        }),
      });

      bcryptCompareSpy.mockResolvedValue(true as never);

      const result = await service.refreshTokens({ refreshToken });

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'refresh-secret',
      });
      expect(result).toHaveProperty('accessToken');
      expect(userModel.updateOne).toHaveBeenCalled();
    });

    it('should throw if refresh token invalid', async () => {
      jwtService.verify = jest.fn(() => {
        throw new Error('invalid');
      });

      await expect(
        service.refreshTokens({ refreshToken: 'bad-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
