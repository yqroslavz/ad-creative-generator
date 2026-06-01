import { Injectable } from '@nestjs/common';
import { CredentialsService } from '../../../credentials/credentials.service';
import type {
  GeneratedImage,
  ImageGenInput,
  ImageProvider,
} from './image.provider';

const MODEL = 'dall-e-3';
const SIZE = '1024x1024';

@Injectable()
export class DalleProvider implements ImageProvider {
  readonly id = 'BYOK_DALLE' as const;

  constructor(private readonly credentials: CredentialsService) {}

  async generate(input: ImageGenInput): Promise<GeneratedImage> {
    if (!input.userId) {
      throw new Error('DalleProvider requires userId in ImageGenInput');
    }

    const apiKey = await this.credentials.getDecryptedKey(
      input.userId,
      'OPENAI',
    );

    const prompt = buildPrompt(input);
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        n: 1,
        size: SIZE,
        response_format: 'b64_json',
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI images ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      data?: { b64_json?: string }[];
    };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error('OpenAI images returned no b64_json');

    return {
      buffer: Buffer.from(b64, 'base64'),
      contentType: 'image/png',
      promptUsed: prompt,
    };
  }
}

function buildPrompt(input: ImageGenInput): string {
  return `Photorealistic native ad creative for ${input.network}. Headline: "${input.headline}". CTA: "${input.cta}". Bright, eye-catching, no text overlay, no logos, clean composition, square 1:1 aspect ratio.`;
}
