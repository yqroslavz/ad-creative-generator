import type {
  AITextProvider,
  CreativeText,
} from './ai-text-provider.interface';

export class OpenAIProvider implements AITextProvider {
  readonly id = 'OPENAI' as const;

  constructor(_apiKey: string) {}

  generate(_prompt: string, _n: number): Promise<CreativeText[]> {
    return Promise.reject(
      new Error('OpenAI provider requires BYOK — available in week 5'),
    );
  }
}
