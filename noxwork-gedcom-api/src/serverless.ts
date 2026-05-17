import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import express from 'express';
import type { Request, Response } from 'express';

const server = express();
let app: NestExpressApplication | undefined;

async function bootstrap(): Promise<void> {
  if (app) return;

  app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(server),
    { logger: ['error', 'warn'] },
  );

  // Vercel enforces its own body size limit upstream (4.5 MB on Hobby, larger on Pro).
  // Keep this in sync with main.ts for local/non-serverless parity.
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const rawOrigin = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';
  const allowedOrigins = rawOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
}

export default async function handler(req: Request, res: Response): Promise<void> {
  await bootstrap();
  server(req, res);
}
