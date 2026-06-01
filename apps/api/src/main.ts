import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const webAppUrl = process.env.WEB_APP_URL ?? 'http://localhost:3000';
  app.enableCors({ origin: webAppUrl, credentials: true });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
