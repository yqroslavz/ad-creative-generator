import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import type { TextProvider, UserApiKey } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { decrypt, encrypt, loadMasterKey, previewOf } from './crypto.util';
import { validateProviderKey } from './provider-validation';
import { isInsideWorker } from './worker-context';
import type { SaveApiKeyInput, UserApiKeyPreview } from './credentials.types';

@Injectable()
export class CredentialsService implements OnModuleInit {
  private masterKey: Buffer | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CredentialsService.name);
  }

  onModuleInit(): void {
    const raw = this.config.get<string>('ENCRYPTION_KEY');
    if (!raw) {
      this.logger.warn(
        'ENCRYPTION_KEY is not set — BYOK features will be disabled',
      );
      return;
    }
    this.masterKey = loadMasterKey(raw);
  }

  private requireKey(): Buffer {
    if (!this.masterKey) {
      throw new BadRequestException(
        'BYOK is not configured on this server (missing ENCRYPTION_KEY)',
      );
    }
    return this.masterKey;
  }

  async save(
    userId: string,
    input: SaveApiKeyInput,
  ): Promise<UserApiKeyPreview> {
    const trimmed = input.key.trim();
    if (trimmed.length < 16) {
      throw new BadRequestException('API key looks too short to be valid');
    }
    const key = this.requireKey();

    try {
      await validateProviderKey(input.provider, trimmed);
    } catch (err) {
      this.logger.warn(
        { provider: input.provider, err: (err as Error).message },
        'Provider validation ping failed',
      );
      throw new BadRequestException(
        `API key validation failed: ${(err as Error).message}`,
      );
    }

    const encryptedKey = encrypt(trimmed, key);
    const keyPreview = previewOf(trimmed);

    const row = await this.prisma.userApiKey.upsert({
      where: {
        userId_provider: { userId, provider: input.provider },
      },
      create: {
        userId,
        provider: input.provider,
        encryptedKey,
        keyPreview,
      },
      update: {
        encryptedKey,
        keyPreview,
        lastUsedAt: null,
      },
    });

    return this.toPreview(row);
  }

  async list(userId: string): Promise<UserApiKeyPreview[]> {
    const rows = await this.prisma.userApiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toPreview(r));
  }

  async delete(userId: string, provider: TextProvider): Promise<boolean> {
    const result = await this.prisma.userApiKey.deleteMany({
      where: { userId, provider },
    });
    return result.count > 0;
  }

  async getDecryptedKey(
    userId: string,
    provider: TextProvider,
  ): Promise<string> {
    if (!isInsideWorker()) {
      throw new UnauthorizedException(
        'getDecryptedKey can only be called inside the BullMQ worker context',
      );
    }
    const key = this.requireKey();

    const row = await this.prisma.userApiKey.findUnique({
      where: { userId_provider: { userId, provider } },
      select: { encryptedKey: true, id: true },
    });
    if (!row) {
      throw new NotFoundException(`No saved ${provider} key for this user`);
    }

    const plaintext = decrypt(row.encryptedKey, key);

    await this.prisma.userApiKey.update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    });

    return plaintext;
  }

  private toPreview(row: UserApiKey): UserApiKeyPreview {
    return {
      provider: row.provider,
      keyPreview: row.keyPreview,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
    };
  }
}
