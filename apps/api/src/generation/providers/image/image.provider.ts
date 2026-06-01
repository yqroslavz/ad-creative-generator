import type { AdNetwork, ImageMode } from '@prisma/client';

export interface ImageGenInput {
  headline: string;
  cta: string;
  network: AdNetwork;
}

export interface GeneratedImage {
  buffer: Buffer;
  contentType: string;
  promptUsed: string;
}

export interface ImageProvider {
  readonly id: ImageMode;
  generate(input: ImageGenInput): Promise<GeneratedImage>;
}
