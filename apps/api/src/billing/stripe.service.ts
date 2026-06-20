import {
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import Stripe from 'stripe';
import type { CreateCheckoutSessionParams } from './billing.types';

const STRIPE_API_VERSION = '2026-05-27.dahlia';

export type StripeEvent = ReturnType<
  Stripe.Stripe['webhooks']['constructEvent']
>;

@Injectable()
export class StripeService implements OnModuleInit {
  private client: Stripe.Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(StripeService.name);
  }

  onModuleInit(): void {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set — billing features will be disabled',
      );
      return;
    }
    this.client = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
  }

  private requireClient(): Stripe.Stripe {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Stripe is not configured on this server (missing STRIPE_SECRET_KEY)',
      );
    }
    return this.client;
  }

  async createCustomer(userId: string, email: string): Promise<string> {
    const customer = await this.requireClient().customers.create({
      email,
      metadata: { userId },
    });
    return customer.id;
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<string> {
    const session = await this.requireClient().checkout.sessions.create({
      mode: 'subscription',
      customer: params.customerId,
      metadata: { userId: params.userId, priceId: params.priceId },
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    if (!session.url) {
      throw new ServiceUnavailableException(
        'Stripe did not return a checkout session URL',
      );
    }
    return session.url;
  }

  constructEvent(rawBody: Buffer, signature: string): StripeEvent {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'STRIPE_WEBHOOK_SECRET is not configured',
      );
    }
    return this.requireClient().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }
}
