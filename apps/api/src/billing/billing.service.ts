import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import type {
  GrantCreditsInput,
  SpendCreditsInput,
  SubscriptionStatusUpdate,
} from './billing.types';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BillingService.name);
  }

  async getBalance(userId: string): Promise<number> {
    const result = await this.prisma.creditTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  async grantCredits(input: GrantCreditsInput): Promise<void> {
    // TODO(Yaroslav): implement per CLAUDE.md Node 2 & Node 3.
    // Idempotent atomic grant. Inside a single prisma.$transaction, attempt to
    // INSERT a CreditTransaction with stripeEventId = input.stripeEventId and
    // amount = +input.amount. The @unique on stripeEventId is the exactly-once
    // guard: on a unique violation (Prisma P2002 / Postgres 23505) treat the
    // event as already-processed and no-op. Do NOT SELECT-then-INSERT. The
    // insert IS both the idempotency guard and the grant, so they cannot
    // partially apply.
    try {
      const { userId, amount, reason, stripeEventId } = input;
      await this.prisma.creditTransaction.create({
        data: { userId, amount, reason, stripeEventId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        return;
      throw error;
    }
  }

  async spendCredits(input: SpendCreditsInput): Promise<void> {
    const { userId, cost } = input;
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            const balance =
              (
                await tx.creditTransaction.aggregate({
                  where: { userId },
                  _sum: { amount: true },
                })
              )._sum.amount ?? 0;
            if (balance < cost) throw new Error('Insufficient credits');
            await tx.creditTransaction.create({
              data: { userId, amount: -cost, reason: 'generation_spend' },
            });
          },
          { isolationLevel: 'Serializable' },
        );
        return;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < maxRetries - 1
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('spendCredits: max retries exceeded');
  }

  async syncSubscriptionStatus(
    update: SubscriptionStatusUpdate,
  ): Promise<void> {
    await this.prisma.subscription.updateMany({
      where: { stripeCustomerId: update.stripeCustomerId },
      data: {
        stripeSubscriptionId: update.stripeSubscriptionId,
        status: update.status,
        currentPeriodEnd: update.currentPeriodEnd,
      },
    });
  }
}
