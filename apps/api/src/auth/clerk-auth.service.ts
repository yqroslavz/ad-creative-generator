import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './auth.types';

@Injectable()
export class ClerkAuthService {
  private readonly logger = new Logger(ClerkAuthService.name);
  private readonly secretKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const key = this.config.get<string>('CLERK_SECRET_KEY');
    if (!key) throw new Error('CLERK_SECRET_KEY is not configured');
    this.secretKey = key;
  }

  async resolveUserFromHeader(
    authorization: string | undefined,
  ): Promise<AuthUser | null> {
    if (!authorization) return null;
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : authorization;
    if (!token) return null;

    let clerkId: string;
    try {
      const payload = await verifyToken(token, { secretKey: this.secretKey });
      if (!payload.sub) return null;
      clerkId = payload.sub;
    } catch (err) {
      this.logger.warn(
        `Token verification failed: ${(err as Error).message}`,
      );
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, clerkId: true, email: true },
    });
    if (!user) return null;

    return { userId: user.id, clerkId: user.clerkId, email: user.email };
  }
}
