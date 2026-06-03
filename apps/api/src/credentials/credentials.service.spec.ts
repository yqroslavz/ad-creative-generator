import { randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { TextProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CredentialsService } from './credentials.service';
import { encrypt } from './crypto.util';
import { workerContextStorage } from './worker-context';
import * as providerValidation from './provider-validation';

type MockedUserApiKey = {
  findUnique: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  findMany: jest.Mock;
  deleteMany: jest.Mock;
};

function makePrismaMock(): { userApiKey: MockedUserApiKey } {
  return {
    userApiKey: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
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

async function buildService(masterKey: Buffer): Promise<{
  service: CredentialsService;
  prisma: { userApiKey: MockedUserApiKey };
}> {
  const prisma = makePrismaMock();
  const config = {
    get: jest.fn().mockReturnValue(masterKey.toString('base64')),
  };
  const mod = await Test.createTestingModule({
    providers: [
      CredentialsService,
      { provide: ConfigService, useValue: config },
      { provide: PrismaService, useValue: prisma },
      { provide: PinoLogger, useValue: makeLoggerMock() },
    ],
  }).compile();

  const service = mod.get(CredentialsService);
  service.onModuleInit();
  return { service, prisma };
}

describe('CredentialsService', () => {
  const masterKey = randomBytes(32);
  const userId = 'user_123';
  const provider: TextProvider = 'ANTHROPIC';
  const plaintext = 'sk-ant-api03-AAAAAAAAAAAAAAAAAAAAA-Wxyz';

  describe('getDecryptedKey ALS gate', () => {
    it('throws UnauthorizedException when called outside the worker context', async () => {
      const { service } = await buildService(masterKey);
      await expect(service.getDecryptedKey(userId, provider)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns the decrypted key inside workerContextStorage.run()', async () => {
      const { service, prisma } = await buildService(masterKey);
      prisma.userApiKey.findUnique.mockResolvedValue({
        id: 'row_1',
        encryptedKey: encrypt(plaintext, masterKey),
      });
      prisma.userApiKey.update.mockResolvedValue({});

      const result = await workerContextStorage.run(
        { jobId: 'j1', requestId: 'r1' },
        () => service.getDecryptedKey(userId, provider),
      );

      expect(result).toBe(plaintext);
      expect(prisma.userApiKey.findUnique).toHaveBeenCalledWith({
        where: { userId_provider: { userId, provider } },
        select: { encryptedKey: true, id: true },
      });
      expect(prisma.userApiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'row_1' },
          data: expect.objectContaining({
            lastUsedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('throws NotFoundException inside worker context when no key row exists', async () => {
      const { service, prisma } = await buildService(masterKey);
      prisma.userApiKey.findUnique.mockResolvedValue(null);

      await expect(
        workerContextStorage.run({ jobId: 'j', requestId: 'r' }, () =>
          service.getDecryptedKey(userId, provider),
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('save', () => {
    it('encrypts the trimmed key and upserts a preview', async () => {
      const { service, prisma } = await buildService(masterKey);
      jest
        .spyOn(providerValidation, 'validateProviderKey')
        .mockResolvedValue(undefined);
      prisma.userApiKey.upsert.mockImplementation(
        (args: { create: Record<string, unknown> }) =>
          Promise.resolve({
            ...args.create,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            lastUsedAt: null,
          }),
      );

      const preview = await service.save(userId, {
        provider,
        key: `  ${plaintext}  `,
      });

      expect(preview.keyPreview).toMatch(/^sk-ant-\.\.\..{4}$/);
      expect(preview.keyPreview).not.toContain(plaintext);
      expect(prisma.userApiKey.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId,
            provider,
            encryptedKey: expect.not.stringContaining(plaintext),
          }),
        }),
      );
    });

    it('rejects keys that are too short', async () => {
      const { service } = await buildService(masterKey);
      await expect(
        service.save(userId, { provider, key: 'too-short' }),
      ).rejects.toThrow(/too short/i);
    });
  });

  describe('list / delete', () => {
    it('list returns previews without encryptedKey', async () => {
      const { service, prisma } = await buildService(masterKey);
      prisma.userApiKey.findMany.mockResolvedValue([
        {
          provider,
          encryptedKey: 'cipher-should-not-leak',
          keyPreview: 'sk-ant-...Wxyz',
          createdAt: new Date('2026-01-01'),
          lastUsedAt: null,
        },
      ]);

      const out = await service.list(userId);
      expect(out).toHaveLength(1);
      expect(out[0]).not.toHaveProperty('encryptedKey');
      expect(out[0].keyPreview).toBe('sk-ant-...Wxyz');
    });

    it('delete returns true only when a row was removed', async () => {
      const { service, prisma } = await buildService(masterKey);
      prisma.userApiKey.deleteMany.mockResolvedValueOnce({ count: 1 });
      prisma.userApiKey.deleteMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.delete(userId, provider)).resolves.toBe(true);
      await expect(service.delete(userId, provider)).resolves.toBe(false);
    });
  });
});
