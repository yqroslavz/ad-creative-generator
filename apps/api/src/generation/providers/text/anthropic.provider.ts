import type {
  AITextProvider,
  CreativeText,
} from './ai-text-provider.interface';

export class AnthropicProvider implements AITextProvider {
  readonly id = 'ANTHROPIC' as const;

  constructor(_apiKey: string) {}

  generate(_prompt: string, _n: number): Promise<CreativeText[]> {
    return Promise.reject(
      new Error('Anthropic provider requires BYOK — available in week 5'),
    );
  }
}
