import { Injectable } from '@nestjs/common';
import type { TextProvider } from '@prisma/client';
import type { AITextProvider } from './ai-text-provider.interface';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import { OpenAIProvider } from './openai.provider';

@Injectable()
export class TextProviderFactory {
  resolve(_userId: string, requested?: TextProvider | null): AITextProvider {
    const choice: TextProvider = requested ?? 'GEMINI';

    switch (choice) {
      case 'GEMINI': {
        const key = process.env.GEMINI_SYSTEM_KEY;
        if (!key) throw new Error('GEMINI_SYSTEM_KEY is not set');
        return new GeminiProvider(key);
      }
      case 'ANTHROPIC':
        return new AnthropicProvider('');
      case 'OPENAI':
        return new OpenAIProvider('');
      default: {
        const exhaustive: never = choice;
        throw new Error(`Unknown text provider: ${String(exhaustive)}`);
      }
    }
  }
}
