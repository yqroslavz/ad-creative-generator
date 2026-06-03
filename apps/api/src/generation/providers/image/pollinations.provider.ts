import { Injectable, Logger } from '@nestjs/common';
import type {
  GeneratedImage,
  ImageGenInput,
  ImageProvider,
} from './image.provider';

const POLLINATIONS_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1_500;
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;

@Injectable()
export class PollinationsProvider implements ImageProvider {
  readonly id = 'POLLINATIONS' as const;
  private readonly logger = new Logger(PollinationsProvider.name);

  async generate(input: ImageGenInput): Promise<GeneratedImage> {
    const prompt = buildImagePrompt(input);
    const token = process.env.POLLINATIONS_TOKEN;
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true&safe=true` +
      (token ? `&token=${encodeURIComponent(token)}` : '');

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        return await this.fetchImage(url, prompt);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `Pollinations attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError.message}`,
        );
        if (attempt < MAX_ATTEMPTS) await delay(RETRY_DELAY_MS);
      }
    }
    throw lastError ?? new Error('Pollinations failed');
  }

  private async fetchImage(
    url: string,
    prompt: string,
  ): Promise<GeneratedImage> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      POLLINATIONS_TIMEOUT_MS,
    );
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Pollinations HTTP ${res.status}`);
      }
      const contentType = res.headers.get('content-type') ?? 'image/jpeg';
      if (!contentType.startsWith('image/')) {
        throw new Error(`Pollinations returned non-image: ${contentType}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.byteLength < 1024) {
        throw new Error(
          `Pollinations payload too small: ${buffer.byteLength}b`,
        );
      }
      return { buffer, contentType, promptUsed: prompt };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildImagePrompt(input: ImageGenInput): string {
  return [
    input.headline,
    'high quality advertising photograph',
    'clean composition',
    'professional lighting',
    'no text no watermark no logo',
  ].join(', ');
}
