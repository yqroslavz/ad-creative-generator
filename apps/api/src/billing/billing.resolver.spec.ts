import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { BillingResolver } from './billing.resolver';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';

const user: AuthUser = {
  userId: 'user_a',
  clerkId: 'clerk_a',
  email: 'a@example.com',
};

function makeMocks() {
  const stripe = {
    createCustomer: jest.fn(),
    createCheckoutSession: jest.fn(),
  };
  const billing = { getBalance: jest.fn() };
  const prisma = {
    subscription: { findUnique: jest.fn(), create: jest.fn() },
  };
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        STRIPE_PRICE_TIER_BASIC: 'price_basic',
        STRIPE_PRICE_TIER_PRO: 'price_pro',
        WEB_APP_URL: 'http://localhost:3000',
      };
      return values[key];
    }),
  };
  return { stripe, billing, prisma, config };
}

async function buildResolver(mocks: ReturnType<typeof makeMocks>) {
  const mod = await Test.createTestingModule({
    providers: [
      BillingResolver,
      { provide: StripeService, useValue: mocks.stripe },
      { provide: BillingService, useValue: mocks.billing },
      { provide: PrismaService, useValue: mocks.prisma },
      { provide: ConfigService, useValue: mocks.config },
    ],
  }).compile();
  return mod.get(BillingResolver);
}

describe('BillingResolver', () => {
  it('myBalance delegates to BillingService.getBalance scoped to the caller', async () => {
    const mocks = makeMocks();
    mocks.billing.getBalance.mockResolvedValue(42);
    const resolver = await buildResolver(mocks);

    await expect(resolver.myBalance(user)).resolves.toBe(42);
    expect(mocks.billing.getBalance).toHaveBeenCalledWith(user.userId);
  });

  it('createCheckoutSession creates a customer when none exists and returns the URL', async () => {
    const mocks = makeMocks();
    mocks.prisma.subscription.findUnique.mockResolvedValue(null);
    mocks.prisma.subscription.create.mockResolvedValue({});
    mocks.stripe.createCustomer.mockResolvedValue('cus_123');
    mocks.stripe.createCheckoutSession.mockResolvedValue(
      'https://checkout.stripe.com/c/session_123',
    );
    const resolver = await buildResolver(mocks);

    const out = await resolver.createCheckoutSession(user, 'PRO');

    expect(out).toEqual({
      url: 'https://checkout.stripe.com/c/session_123',
    });
    expect(mocks.stripe.createCustomer).toHaveBeenCalledWith(
      user.userId,
      user.email,
    );
    expect(mocks.stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_123', priceId: 'price_pro' }),
    );
  });

  it('createCheckoutSession reuses an existing Stripe customer', async () => {
    const mocks = makeMocks();
    mocks.prisma.subscription.findUnique.mockResolvedValue({
      stripeCustomerId: 'cus_existing',
    });
    mocks.stripe.createCheckoutSession.mockResolvedValue('https://checkout/x');
    const resolver = await buildResolver(mocks);

    await resolver.createCheckoutSession(user, 'BASIC');

    expect(mocks.stripe.createCustomer).not.toHaveBeenCalled();
    expect(mocks.stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cus_existing',
        priceId: 'price_basic',
      }),
    );
  });
});
