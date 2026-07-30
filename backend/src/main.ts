import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const config = app.get(ConfigService);

  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  const isDev = nodeEnv !== 'production';

  // In development make CORS permissive to avoid local origin/port issues.
  // In production, keep a strict allowlist.
  if (isDev) {
    app.enableCors({ origin: true, methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'], credentials: true });
  } else {
    const allowedOrigins = [
      config.get<string>('FRONTEND_URL', 'http://localhost:5175'),
      config.get<string>('ADMIN_FRONTEND_URL', 'http://localhost:5175'),
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5175',
    ];

    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
      credentials: true,
    });
  }

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Serve uploaded documents/ID scans/selfies statically for admin review.
  app.useStaticAssets(join(process.cwd(), config.get<string>('UPLOADS_DIR', './uploads')), {
    prefix: '/uploads/',
  });

  const port = config.get<number>('PORT', 5000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Fortune Sacco Onboarding API running on http://localhost:${port}/api`);
}
bootstrap();
