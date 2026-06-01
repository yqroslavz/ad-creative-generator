import { Module } from '@nestjs/common';
import { ClerkWebhookController } from './clerk.controller';

@Module({
  controllers: [ClerkWebhookController],
})
export class WebhooksModule {}
