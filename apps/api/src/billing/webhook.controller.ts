import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { StripeService, type StripeEvent } from './stripe.service';

type StripeSubscription = Extract<
  StripeEvent,
  { type: 'customer.subscription.updated' }
>['data']['object'];

type CheckoutSessionCompleted = Extract<
  StripeEvent,
  { type: 'checkout.session.completed' }
>['data']['object'];

@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  private readonly creditsByPrice: Record<string, number>;

  constructor(
    private readonly stripe: StripeService,
    private readonly billing: BillingService,
    config: ConfigService,
  ) {
    const basicPriceId = config.get<string>('STRIPE_PRICE_TIER_BASIC');
    const proPriceId = config.get<string>('STRIPE_PRICE_TIER_PRO');
    this.creditsByPrice = {
      ...(basicPriceId ? { [basicPriceId]: 100 } : {}),
      ...(proPriceId ? { [proPriceId]: 500 } : {}),
    };
  }

  @Post('webhook')
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<{ rawBody?: Buffer }>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    // TODO(Yaroslav): implement per CLAUDE.md Node 1.
    // Stripe signs the RAW request bytes; constructEvent must receive the
    // original Buffer, not re-serialized JSON. Obtain the raw body scoped to
    // THIS route only (configured in main.ts) while every other route,
    // especially GraphQL, keeps JSON parsing. Body parsing happens at
    // middleware level before controllers run, so an interceptor is too late.
    const rawBody = req.rawBody;
    if (!rawBody) throw new BadRequestException('Raw body missing');
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: StripeEvent;
    try {
      event = this.stripe.constructEvent(rawBody, signature);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        await this.handleCheckoutCompleted(event.data.object, event.id);
        break;
      }
      // TODO: recurring renewals — handle 'invoice.payment_succeeded' here once
      // Node 2 & Node 3 land, so monthly subscription renewals also grant credits.
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await this.handleSubscriptionChange(event.data.object);
        break;
      }
      default:
        this.logger.log(`Ignoring Stripe event: ${event.type}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(
    session: CheckoutSessionCompleted,
    stripeEventId: string,
  ): Promise<void> {
    const userId = session.metadata?.userId;
    const priceId = session.metadata?.priceId;
    const amount = priceId ? this.creditsByPrice[priceId] : undefined;

    if (!userId || amount === undefined) {
      this.logger.warn(
        `checkout.session.completed missing grant data (sessionId=${session.id}, userId=${userId ?? 'none'}, priceId=${priceId ?? 'none'}) — acknowledging without grant`,
      );
      return;
    }

    await this.billing.grantCredits({
      userId,
      amount,
      reason: 'subscription_grant',
      stripeEventId,
    });
  }

  private async handleSubscriptionChange(
    subscription: StripeSubscription,
  ): Promise<void> {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;
    const periodEnd = subscription.items.data[0]?.current_period_end ?? null;

    await this.billing.syncSubscriptionStatus({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    });
  }
}
