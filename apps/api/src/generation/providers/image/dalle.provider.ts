import { Injectable } from '@nestjs/common';
import type {
  GeneratedImage,
  ImageGenInput,
  ImageProvider,
} from './image.provider';

@Injectable()
export class DalleProvider implements ImageProvider {
  readonly id = 'BYOK_DALLE' as const;

  generate(_input: ImageGenInput): Promise<GeneratedImage> {
    return Promise.reject(
      new Error('DALL-E requires BYOK OpenAI key — available in week 5'),
    );
  }
}
