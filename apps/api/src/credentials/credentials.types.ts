import type { TextProvider } from '@prisma/client';

export interface UserApiKeyPreview {
  provider: TextProvider;
  keyPreview: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface SaveApiKeyInput {
  provider: TextProvider;
  key: string;
}
