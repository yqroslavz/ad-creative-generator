import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './webhook.controller';

type RawReq = { rawBody?: Buffer };

function makeReq(body = '{}'): RawReq {
  return { rawBody: Buffer.from(body) };
}

function makeMocks() {
  const stripe = { constructEvent: jest.fn() };
  const billing = {
    grantCredits: jest.fn(),
    syncSubscriptionStatus: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        STRIPE_PRICE_TIER_BASIC: 'price_basic',
        STRIPE_PRICE_TIER_PRO: 'price_pro',
      };
      return values[key];
    }),
  };
  return { stripe, billing, config };
}

async function buildController(mocks: ReturnType<typeof makeMocks>) {
  const mod = await Test.createTestingModule({
    controllers: [StripeWebhookController],
    providers: [
      { provide: StripeService, useValue: mocks.stripe },
      { provide: BillingService, useValue: mocks.billing },
      { provide: ConfigService, useValue: mocks.config },
    ],
  }).compile();
  return mod.get(StripeWebhookController);
}

describe('StripeWebhookController', () => {
  it('rejects when the raw body is missing', async () => {
    const mocks = makeMocks();
    const controller = await buildController(mocks);

    await expect(controller.handle({}, 'sig')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns 400 when signature verification throws', async () => {
    const mocks = makeMocks();
    mocks.stripe.constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const controller = await buildController(mocks);

    await expect(controller.handle(makeReq(), 'sig')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('verifies the signature and acknowledges an unhandled event with 200', async () => {
    const mocks = makeMocks();
    mocks.stripe.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'invoice.payment_succeeded',
    });
    const controller = await buildController(mocks);

    const out = await controller.handle(makeReq(), 'sig');

    expect(out).toEqual({ received: true });
    expect(mocks.stripe.constructEvent).toHaveBeenCalledTimes(1);
    expect(mocks.billing.grantCredits).not.toHaveBeenCalled();
  });

  it('maps checkout.session.completed metadata into the grantCredits call', async () => {
    const mocks = makeMocks();
    mocks.stripe.constructEvent.mockReturnValue({
      id: 'evt_grant',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          metadata: { userId: 'user_a', priceId: 'price_pro' },
        },
      },
    });
    const controller = await buildController(mocks);

    const out = await controller.handle(makeReq(), 'sig');

    expect(out).toEqual({ received: true });
    expect(mocks.billing.grantCredits).toHaveBeenCalledWith({
      userId: 'user_a',
      amount: 500,
      reason: 'subscription_grant',
      stripeEventId: 'evt_grant',
    });
  });

  it('acknowledges with 200 and skips the grant when metadata is incomplete', async () => {
    const mocks = makeMocks();
    mocks.stripe.constructEvent.mockReturnValue({
      id: 'evt_bad',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_2', metadata: { userId: 'user_a' } } },
    });
    const controller = await buildController(mocks);

    const out = await controller.handle(makeReq(), 'sig');

    expect(out).toEqual({ received: true });
    expect(mocks.billing.grantCredits).not.toHaveBeenCalled();
  });

  // TODO(Yaroslav): once Node 2 & Node 3 land, assert that replaying the SAME
  // event id grants credits exactly once (idempotency) and that the grant runs
  // inside a single transaction.
  it.todo('grants credits exactly once when the same event id is replayed');
});
