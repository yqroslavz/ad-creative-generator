import { GoogleGenAI, Type } from '@google/genai';
import type {
  AITextProvider,
  CreativeText,
} from './ai-text-provider.interface';

const MODEL = 'gemini-2.5-flash';

export class GeminiProvider implements AITextProvider {
  readonly id = 'GEMINI' as const;
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Gemini API key is required');
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(prompt: string, n: number): Promise<CreativeText[]> {
    const response = await this.client.models.generateContent({
      model: MODEL,
      contents: `${prompt}\n\nGenerate exactly ${n} distinct variants.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          minItems: String(n),
          maxItems: String(n),
          items: {
            type: Type.OBJECT,
            required: ['headline', 'description', 'cta'],
            properties: {
              headline: { type: Type.STRING },
              description: { type: Type.STRING },
              cta: { type: Type.STRING },
            },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error('Gemini returned empty response');

    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('Gemini response is not an array');
    }

    return parsed.slice(0, n).map((item, idx) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        typeof (item as Record<string, unknown>).headline !== 'string' ||
        typeof (item as Record<string, unknown>).description !== 'string' ||
        typeof (item as Record<string, unknown>).cta !== 'string'
      ) {
        throw new Error(`Gemini item ${idx} missing required fields`);
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
