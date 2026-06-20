import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // TODO(Yaroslav): implement per CLAUDE.md Node 1 — scope raw body parsing to
    // the /stripe/webhook route only (e.g. express.raw on that path) so Stripe
    // signature verification sees the original bytes, while every other route,
    // especially GraphQL, keeps JSON parsing. `rawBody: true` is the current
    // global capture; decide and justify the scoping in NOTES.md.
    rawBody: true,
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const webAppUrl = process.env.WEB_APP_URL ?? 'http://localhost:3000';
  app.enableCors({ origin: webAppUrl, credentials: true });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);

  app.get(Logger).log(`API listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
