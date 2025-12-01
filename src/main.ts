import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json } from 'express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure JSON parser with raw body for webhook signature verification
  app.use(
    json({
      verify: (req: any, res, buf) => {
        // Store raw body for Stripe webhook signature verification
        if (req.url === '/stripe/webhook') {
          req.rawBody = buf;
        }
      },
    }),
  );

  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enforce DTO validation & payload sanitisation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Subscription Management API')
    .setDescription('NestJS API for managing subscriptions with Stripe integration')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Plans', 'Subscription plans')
    .addTag('Subscriptions', 'User subscriptions')
    .addTag('Admin', 'Admin operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
