import { BadRequestException, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import type { BillingTier, CheckoutSession } from './billing.types';

@Resolver('CheckoutSession')
@UseGuards(GqlAuthGuard)
export class BillingResolver {
  constructor(
    private readonly stripe: StripeService,
    private readonly billing: BillingService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Query('myBalance')
  myBalance(@CurrentUser() user: AuthUser): Promise<number> {
    return this.billing.getBalance(user.userId);
  }

  @Mutation('createCheckoutSession')
  async createCheckoutSession(
    @CurrentUser() user: AuthUser,
    @Args('tier') tier: BillingTier,
  ): Promise<CheckoutSession> {
    const priceId = this.resolvePriceId(tier);
    const customerId = await this.ensureCustomer(user);
    const webAppUrl =
      this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3000';

    const url = await this.stripe.createCheckoutSession({
      customerId,
      priceId,
      userId: user.userId,
      successUrl: `${webAppUrl}/billing/success`,
      cancelUrl: `${webAppUrl}/billing/cancel`,
    });

    return { url };
  }

  private resolvePriceId(tier: BillingTier): string {
    const envKey =
      tier === 'PRO' ? 'STRIPE_PRICE_TIER_PRO' : 'STRIPE_PRICE_TIER_BASIC';
    const priceId = this.config.get<string>(envKey);
    if (!priceId) {
      throw new BadRequestException(
        `No Stripe price configured for tier ${tier}`,
      );
    }
    return priceId;
  }

  private async ensureCustomer(user: AuthUser): Promise<string> {
    const existing = await this.prisma.subscription.findUnique({
      where: { userId: user.userId },
      select: { stripeCustomerId: true },
    });
    if (existing) return existing.stripeCustomerId;

    const stripeCustomerId = await this.stripe.createCustomer(
      user.userId,
      user.email,
    );
    await this.prisma.subscription.create({
      data: {
        userId: user.userId,
        stripeCustomerId,
        status: 'incomplete',
        tier: 'none',
      },
    });
    return stripeCustomerId;
  }
}
