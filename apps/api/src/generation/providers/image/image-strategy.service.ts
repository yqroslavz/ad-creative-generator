import { Injectable, Logger } from '@nestjs/common';
import type { ImageMode } from '@prisma/client';
import { S3Service } from '../../../storage/s3.service';
import type {
  GeneratedImage,
  ImageGenInput,
  ImageProvider,
} from './image.provider';
import { DalleProvider } from './dalle.provider';
import { PollinationsProvider } from './pollinations.provider';
import { SvgFallbackProvider } from './svg-fallback.provider';

export interface ImageResult {
  url: string;
  mode: ImageMode;
  promptUsed: string;
}

@Injectable()
export class ImageStrategyService {
  private readonly logger = new Logger(ImageStrategyService.name);

  constructor(
    private readonly s3: S3Service,
    private readonly pollinations: PollinationsProvider,
    private readonly svgFallback: SvgFallbackProvider,
    private readonly dalle: DalleProvider,
  ) {}

  async generateAndUpload(
    requestId: string,
    creativeIndex: number,
    input: ImageGenInput,
    useByokDalle: boolean,
  ): Promise<ImageResult> {
    const chain: ImageProvider[] = useByokDalle
      ? [this.dalle, this.pollinations, this.svgFallback]
      : [this.pollinations, this.svgFallback];

    let image: GeneratedImage | null = null;
    let usedProvider: ImageProvider | null = null;

    for (const provider of chain) {
      try {
        image = await provider.generate(input);
        usedProvider = provider;
        break;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Image provider ${provider.id} failed for ${requestId}#${creativeIndex}: ${message}`,
        );
      }
    }

    if (!image || !usedProvider) {
      throw new Error(
        `All image providers failed for ${requestId}#${creativeIndex}`,
      );
    }

    const ext = extFromContentType(image.contentType);
    const key = `${requestId}/${creativeIndex}.${ext}`;
    const url = await this.s3.upload(key, image.buffer, image.contentType);

    return { url, mode: usedProvider.id, promptUsed: image.promptUsed };
  }
}

function extFromContentType(ct: string): string {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  return 'jpg';
}
