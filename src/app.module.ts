import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { StripeModule } from './stripe/stripe.module';
import { PlansModule } from './plans/plans.module';
import { UsersModule } from './users/users.module';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),

        // Database
        MONGODB_URI: Joi.string().uri().required(),

        // JWT
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRATION: Joi.number().min(8).optional(),
        JWT_JWT_REFRESH_EXPIRATION: Joi.number().min(8).optional(),

        // Stripe
        STRIPE_SECRET_KEY: Joi.string()
          .pattern(/^sk_(test|live)_[A-Za-z0-9]+/)
          .required(),
        STRIPE_WEBHOOK_SECRET: Joi.string()
          .pattern(/^whsec_[A-Za-z0-9]+/)
          .required(),

        // App
        APP_URL: Joi.string()
          .uri()
          .default('http://localhost:3000'),
        PORT: Joi.number().port().default(3000),
      }),
      validationOptions: {
        abortEarly: false,
      },
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://mongo:27017/nest'),
    AuthModule,
    RolesModule,
    SubscriptionsModule,
    StripeModule,
    PlansModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
