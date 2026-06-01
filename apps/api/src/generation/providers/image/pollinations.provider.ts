import { Injectable } from '@nestjs/common';
import type {
  GeneratedImage,
  ImageGenInput,
  ImageProvider,
} from './image.provider';

const POLLINATIONS_TIMEOUT_MS = 10_000;
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;

@Injectable()
export class PollinationsProvider implements ImageProvider {
  readonly id = 'POLLINATIONS' as const;

  async generate(input: ImageGenInput): Promise<GeneratedImage> {
    const prompt = buildImagePrompt(input);
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true&safe=true`;

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

function buildImagePrompt(input: ImageGenInput): string {
  return [
    input.headline,
    'high quality advertising photograph',
    'clean composition',
    'professional lighting',
    'no text no watermark no logo',
  ].join(', ');
}
