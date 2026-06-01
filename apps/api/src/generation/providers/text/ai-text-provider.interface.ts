export interface CreativeText {
  headline: string;
  description: string;
  cta: string;
}

export interface AITextProvider {
  readonly id: 'GEMINI' | 'ANTHROPIC' | 'OPENAI';
  generate(prompt: string, n: number): Promise<CreativeText[]>;
}
