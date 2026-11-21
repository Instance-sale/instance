import path from 'node:path';
import dotenv from 'dotenv';

// Load root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security headers via Helmet (CSP disabled to allow pure API response flexibility)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cookie parser for reading NextAuth session tokens
  app.use(cookieParser());

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global permissive ValidationPipe (strips non-whitelisted, doesn't throw 400 on unexpected extra fields)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global prefix: /api
  app.setGlobalPrefix('api');

  // CORS configuration
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:4000',
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token', 'Cookie', 'X-API-Key', 'x-api-key'],
  });

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 @instance/api is running on port ${port} (prefix: /api)`);
}

bootstrap();
