import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';

type MockedCreditTransaction = {
  aggregate: jest.Mock;
  create: jest.Mock;
};

type PrismaMock = {
  creditTransaction: MockedCreditTransaction;
  $transaction: jest.Mock;
};

function makeTxClient(): { creditTransaction: MockedCreditTransaction } {
  return {
    creditTransaction: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
  };
}

function makePrismaMock(): PrismaMock {
  return {
    creditTransaction: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

function makeLoggerMock(): PinoLogger {
  return {
    setContext: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as PinoLogger;
}

async function buildService(prisma: PrismaMock): Promise<BillingService> {
  const mod = await Test.createTestingModule({
    providers: [
      BillingService,
      { provide: PrismaService, useValue: prisma },
      { provide: PinoLogger, useValue: makeLoggerMock() },
    ],
  }).compile();
  return mod.get(BillingService);
}

function knownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(code, {
    code,
    clientVersion: 'test',
  });
}

const userId = 'user_123';

describe('BillingService', () => {
  describe('grantCredits (Node 2 idempotency)', () => {
    it('inserts a +amount ledger row on the first grant', async () => {
      const prisma = makePrismaMock();
      prisma.creditTransaction.create.mockResolvedValue({});
      const service = await buildService(prisma);

      await service.grantCredits({
        userId,
        amount: 500,
        reason: 'subscription_grant',
        stripeEventId: 'evt_1',
      });

      expect(prisma.creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          amount: 500,
          reason: 'subscription_grant',
          stripeEventId: 'evt_1',
        },
      });
    });

    it('is a no-op (no throw) when the same stripeEventId hits the unique constraint (P2002)', async () => {
      const prisma = makePrismaMock();
      prisma.creditTransaction.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(knownError('P2002'));
      const service = await buildService(prisma);

      const grant = {
        userId,
        amount: 500,
        reason: 'subscription_grant',
        stripeEventId: 'evt_dup',
      };

      await service.grantCredits(grant);
      await expect(service.grantCredits(grant)).resolves.toBeUndefined();
      expect(prisma.creditTransaction.create).toHaveBeenCalledTimes(2);
    });

    it('rethrows non-P2002 errors', async () => {
      const prisma = makePrismaMock();
      prisma.creditTransaction.create.mockRejectedValue(knownError('P2003'));
      const service = await buildService(prisma);

      await expect(
        service.grantCredits({
          userId,
          amount: 100,
          reason: 'subscription_grant',
          stripeEventId: 'evt_x',
        }),
      ).rejects.toThrow();
    });
  });

  describe('spendCredits (Node 3 atomic spend)', () => {
    it('inserts a -cost ledger row when balance >= cost', async () => {
      const prisma = makePrismaMock();
      const tx = makeTxClient();
      tx.creditTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 100 },
      });
      tx.creditTransaction.create.mockResolvedValue({});
      prisma.$transaction.mockImplementation(
        (cb: (client: typeof tx) => Promise<void>) => cb(tx),
      );
      const service = await buildService(prisma);

      await service.spendCredits({ userId, cost: 30, reason: 'generation' });

      expect(tx.creditTransaction.create).toHaveBeenCalledWith({
        data: { userId, amount: -30, reason: 'generation_spend' },
      });
    });

    it('throws Insufficient credits and writes nothing when balance < cost', async () => {
      const prisma = makePrismaMock();
      const tx = makeTxClient();
      tx.creditTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 10 },
      });
      prisma.$transaction.mockImplementation(
        (cb: (client: typeof tx) => Promise<void>) => cb(tx),
      );
      const service = await buildService(prisma);

      await expect(
        service.spendCredits({ userId, cost: 50, reason: 'generation' }),
      ).rejects.toThrow('Insufficient credits');
      expect(tx.creditTransaction.create).not.toHaveBeenCalled();
    });

    it('retries on a serialization failure (P2034) and spends exactly once', async () => {
      const prisma = makePrismaMock();
      const tx = makeTxClient();
      tx.creditTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 100 },
      });
      tx.creditTransaction.create.mockResolvedValue({});
      prisma.$transaction
        .mockRejectedValueOnce(knownError('P2034'))
        .mockImplementationOnce((cb: (client: typeof tx) => Promise<void>) =>
          cb(tx),
        );
      const service = await buildService(prisma);

      await expect(
        service.spendCredits({ userId, cost: 20, reason: 'generation' }),
      ).resolves.toBeUndefined();

      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(tx.creditTransaction.create).toHaveBeenCalledTimes(1);
    });
  });
});
