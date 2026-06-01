import { BadRequestException, Injectable } from '@nestjs/common';
import type { TextProvider } from '@prisma/client';
import { CredentialsService } from '../../../credentials/credentials.service';
import type { AITextProvider } from './ai-text-provider.interface';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';

export interface ResolvedTextProvider {
  provider: AITextProvider;
  wasBYOK: boolean;
}

@Injectable()
export class TextProviderFactory {
  constructor(private readonly credentials: CredentialsService) {}

  async resolve(
    userId: string,
    requested?: TextProvider | null,
  ): Promise<ResolvedTextProvider> {
    const choice: TextProvider = requested ?? 'GEMINI';

    switch (choice) {
      case 'GEMINI': {
        const key = process.env.GEMINI_SYSTEM_KEY;
        if (!key) throw new Error('GEMINI_SYSTEM_KEY is not set');
        return { provider: new GeminiProvider(key), wasBYOK: false };
      }
      case 'ANTHROPIC': {
        const key = await this.tryBYOK(userId, 'ANTHROPIC');
        return { provider: new AnthropicProvider(key), wasBYOK: true };
      }
      case 'OPENAI': {
        const key = await this.tryBYOK(userId, 'OPENAI');
        return { provider: new OpenAIProvider(key), wasBYOK: true };
      }
      default: {
        const exhaustive: never = choice;
        throw new Error(`Unknown text provider: ${String(exhaustive)}`);
      }
    }
  }

  private async tryBYOK(
    userId: string,
    provider: TextProvider,
  ): Promise<string> {
    try {
      return await this.credentials.getDecryptedKey(userId, provider);
    } catch {
      throw new BadRequestException(
        `${provider} requires a saved API key in /settings/api-keys`,
      );
    }
  }
}
