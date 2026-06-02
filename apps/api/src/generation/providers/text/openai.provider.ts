import type {
  AITextProvider,
  CreativeText,
} from './ai-text-provider.interface';

const MODEL = 'gpt-4o-mini';

export class OpenAIProvider implements AITextProvider {
  readonly id = 'OPENAI' as const;

  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new Error('OpenAI API key is required');
  }

  async generate(prompt: string, n: number): Promise<CreativeText[]> {
    const body = {
      model: MODEL,
      response_format: { type: 'json_object' as const },
      messages: [
        {
          role: 'system' as const,
          content:
            'You return a JSON object {"creatives": [...]} where each item has headline, description, cta.',
        },
        {
          role: 'user' as const,
          content: `${prompt}\n\nReturn exactly ${n} variants in the "creatives" array.`,
        },
      ],
    };

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? '';
    if (!content) throw new Error('OpenAI returned empty response');

    const parsed: unknown = JSON.parse(content);
    const arr =
      parsed && typeof parsed === 'object' && 'creatives' in parsed
        ? parsed.creatives
        : parsed;
    if (!Array.isArray(arr)) {
      throw new Error('OpenAI response missing creatives array');
    }
    return arr.slice(0, n).map((item, idx) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof (item as Record<string, unknown>).headline !== 'string' ||
        typeof (item as Record<string, unknown>).description !== 'string' ||
        typeof (item as Record<string, unknown>).cta !== 'string'
      ) {
        throw new Error(`OpenAI item ${idx} missing required fields`);
      }
      const obj = item as Record<string, string>;
      return {
        headline: obj.headline,
        description: obj.description,
        cta: obj.cta,
      };
    });
  }
}
