import { Module } from '@nestjs/common';
import { BillingResolver } from './billing.resolver';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './webhook.controller';

@Module({
  controllers: [StripeWebhookController],
  providers: [StripeService, BillingService, BillingResolver],
  exports: [BillingService, StripeService],
})
export class BillingModule {}
