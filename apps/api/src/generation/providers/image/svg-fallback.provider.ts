import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import type { AdNetwork } from '@prisma/client';
import type {
  GeneratedImage,
  ImageGenInput,
  ImageProvider,
} from './image.provider';

const IMAGE_SIZE = 1024;

const NETWORK_GRADIENTS: Record<AdNetwork, [string, string]> = {
  TABOOLA: ['#1e3a8a', '#3b82f6'],
  OUTBRAIN: ['#ea580c', '#facc15'],
  MGID: ['#6d28d9', '#ec4899'],
  TIKTOK: ['#ec4899', '#06b6d4'],
  REVCONTENT: ['#047857', '#84cc16'],
  ADSKEEPER: ['#0f766e', '#22d3ee'],
};

let cachedFont: Buffer | null = null;

function loadFont(): Buffer {
  if (cachedFont) return cachedFont;
  const pkgJsonPath = require.resolve('@fontsource/inter/package.json');
  const fontPath = join(
    dirname(pkgJsonPath),
    'files',
    'inter-latin-700-normal.woff',
  );
  cachedFont = readFileSync(fontPath);
  return cachedFont;
}

@Injectable()
export class SvgFallbackProvider implements ImageProvider {
  readonly id = 'SVG_FALLBACK' as const;
  private readonly logger = new Logger(SvgFallbackProvider.name);

  async generate(input: ImageGenInput): Promise<GeneratedImage> {
    const [from, to] = NETWORK_GRADIENTS[input.network];
    const fontData = loadFont();

    const tree = {
      type: 'div',
      key: 'root',
      props: {
        style: {
          width: IMAGE_SIZE,
          height: IMAGE_SIZE,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            key: 'badge',
            props: {
              style: {
                fontSize: 36,
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              },
              children: input.network,
            },
          },
          {
            type: 'div',
            key: 'headline',
            props: {
              style: {
                fontSize: 84,
                color: 'white',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                display: 'flex',
              },
              children: truncate(input.headline, 110),
            },
          },
          {
            type: 'div',
            key: 'cta',
            props: {
              style: {
                alignSelf: 'flex-start',
                fontSize: 36,
                color: 'white',
                padding: '20px 40px',
                borderRadius: '999px',
                border: '3px solid rgba(255,255,255,0.8)',
              },
              children: truncate(input.cta, 28),
            },
          },
        ],
      },
    };

    const svg = await satori(tree, {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      fonts: [{ name: 'Inter', data: fontData, weight: 700, style: 'normal' }],
    });

    const png = new Resvg(svg, {
      fitTo: { mode: 'width', value: IMAGE_SIZE },
    })
      .render()
      .asPng();

    this.logger.log(
      `Rendered SVG fallback for ${input.network} (${png.byteLength} bytes)`,
    );

    return {
      buffer: Buffer.from(png),
      contentType: 'image/png',
      promptUsed: `svg-fallback:${input.network}`,
    };
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
