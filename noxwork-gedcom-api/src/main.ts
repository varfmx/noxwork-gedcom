import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Increase body-parser limits to handle large GEDCOM file uploads
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS — supports a comma-separated list of allowed origins.
  // e.g. CORS_ORIGIN="http://localhost:5173,https://noxwork-gedcom.vercel.app"
  const rawOrigin = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';
  const allowedOrigins = rawOrigin.split(',').map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global prefix for all API routes
  app.setGlobalPrefix('api');

  // Enable validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();

