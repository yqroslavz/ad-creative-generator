import type {
  AITextProvider,
  CreativeText,
} from './ai-text-provider.interface';

const MODEL = 'claude-haiku-4-5-20251001';
const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicProvider implements AITextProvider {
  readonly id = 'ANTHROPIC' as const;

  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new Error('Anthropic API key is required');
  }

  async generate(prompt: string, n: number): Promise<CreativeText[]> {
    const body = {
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user' as const,
          content: `${prompt}\n\nReturn exactly ${n} variants as a JSON array. Each item must have keys: headline, description, cta. Respond with ONLY the JSON array, no prose, no markdown fences.`,
        },
      ],
    };

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = json.content?.find((c) => c.type === 'text')?.text ?? '';
    if (!text) throw new Error('Anthropic returned empty response');

    return parseCreativesArray(text, n);
  }
}

function parseCreativesArray(text: string, n: number): CreativeText[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Anthropic response is not a JSON array');
  }
  const parsed: unknown = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error('Anthropic response is not an array');
  }
  return parsed.slice(0, n).map((item, idx) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Record<string, unknown>).headline !== 'string' ||
      typeof (item as Record<string, unknown>).description !== 'string' ||
      typeof (item as Record<string, unknown>).cta !== 'string'
    ) {
      throw new Error(`Anthropic item ${idx} missing required fields`);
    }
    const obj = item as Record<string, string>;
    return {
      headline: obj.headline,
      description: obj.description,
      cta: obj.cta,
    };
  });
}
