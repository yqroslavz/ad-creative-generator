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
const PADDING = 72;

interface NetworkTheme {
  from: string;
  to: string;
  accent: string;
  ctaText: string;
}

const NETWORK_THEMES: Record<AdNetwork, NetworkTheme> = {
  TABOOLA: {
    from: '#1e3a8a',
    to: '#2563eb',
    accent: '#93c5fd',
    ctaText: '#1e3a8a',
  },
  OUTBRAIN: {
    from: '#b45309',
    to: '#f59e0b',
    accent: '#fde68a',
    ctaText: '#92400e',
  },
  MGID: {
    from: '#5b21b6',
    to: '#db2777',
    accent: '#f0abfc',
    ctaText: '#6d28d9',
  },
  TIKTOK: {
    from: '#0f172a',
    to: '#0ea5e9',
    accent: '#67e8f9',
    ctaText: '#0f172a',
  },
  REVCONTENT: {
    from: '#065f46',
    to: '#16a34a',
    accent: '#bbf7d0',
    ctaText: '#065f46',
  },
  ADSKEEPER: {
    from: '#0e7490',
    to: '#06b6d4',
    accent: '#a5f3fc',
    ctaText: '#155e75',
  },
};

type FontWeight = 400 | 700 | 900;
const FONT_WEIGHTS: FontWeight[] = [400, 700, 900];
let cachedFonts: { name: string; data: Buffer; weight: FontWeight }[] | null =
  null;

function loadFonts(): { name: string; data: Buffer; weight: FontWeight }[] {
  if (cachedFonts) return cachedFonts;
  const pkgJsonPath = require.resolve('@fontsource/inter/package.json');
  const filesDir = join(dirname(pkgJsonPath), 'files');
  cachedFonts = FONT_WEIGHTS.map((weight) => ({
    name: 'Inter',
    weight,
    data: readFileSync(join(filesDir, `inter-latin-${weight}-normal.woff`)),
  }));
  return cachedFonts;
}

function headlineFontSize(text: string): number {
  if (text.length <= 32) return 88;
  if (text.length <= 60) return 72;
  if (text.length <= 100) return 58;
  return 48;
}

@Injectable()
export class SvgFallbackProvider implements ImageProvider {
  readonly id = 'SVG_FALLBACK' as const;
  private readonly logger = new Logger(SvgFallbackProvider.name);

  async generate(input: ImageGenInput): Promise<GeneratedImage> {
    const theme = NETWORK_THEMES[input.network];
    const fonts = loadFonts();
    const headline = truncate(input.headline, 120);
    const description = input.description
      ? truncate(input.description, 140)
      : null;
    const cta = truncate(input.cta, 28);

    const tree = {
      type: 'div',
      key: 'root',
      props: {
        style: {
          position: 'relative',
          width: IMAGE_SIZE,
          height: IMAGE_SIZE,
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(145deg, ${theme.from} 0%, ${theme.to} 100%)`,
          fontFamily: 'Inter',
          overflow: 'hidden',
        },
        children: [
          decorCircle('c1', {
            top: -180,
            right: -140,
            size: 520,
            color: 'rgba(255,255,255,0.10)',
          }),
          decorCircle('c2', {
            bottom: -220,
            left: -160,
            size: 560,
            color: 'rgba(255,255,255,0.07)',
          }),
          {
            type: 'div',
            key: 'shade',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.38) 100%)',
              },
            },
          },
          {
            type: 'div',
            key: 'content',
            props: {
              style: {
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                padding: PADDING,
              },
              children: [
                topRow(input.network),
                middleBlock(headline, description, theme.accent),
                bottomBlock(cta, theme.ctaText),
              ],
            },
          },
        ],
      },
    };

    const svg = await satori(tree, {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      fonts: fonts.map((f) => ({ ...f, style: 'normal' as const })),
    });

    const png = new Resvg(svg, {
      fitTo: { mode: 'width', value: IMAGE_SIZE },
    })
      .render()
      .asPng();

    this.logger.log(
      `Rendered SVG ad mockup for ${input.network} (${png.byteLength} bytes)`,
    );

    return {
      buffer: Buffer.from(png),
      contentType: 'image/png',
      promptUsed: `svg-mockup:${input.network}`,
    };
  }
}

function decorCircle(
  key: string,
  opts: {
    size: number;
    color: string;
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  },
) {
  return {
    type: 'div',
    key,
    props: {
      style: {
        position: 'absolute',
        width: opts.size,
        height: opts.size,
        borderRadius: opts.size,
        background: opts.color,
        ...(opts.top !== undefined ? { top: opts.top } : {}),
        ...(opts.bottom !== undefined ? { bottom: opts.bottom } : {}),
        ...(opts.left !== undefined ? { left: opts.left } : {}),
        ...(opts.right !== undefined ? { right: opts.right } : {}),
      },
    },
  };
}

function topRow(network: AdNetwork) {
  return {
    type: 'div',
    key: 'top',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      children: [
        {
          type: 'div',
          key: 'sponsored',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.16)',
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: 26,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.95)',
              letterSpacing: '0.08em',
            },
            children: 'SPONSORED',
          },
        },
        {
          type: 'div',
          key: 'network',
          props: {
            style: {
              fontSize: 26,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '0.18em',
            },
            children: network,
          },
        },
      ],
    },
  };
}

function middleBlock(
  headline: string,
  description: string | null,
  accent: string,
) {
  const children = [
    {
      type: 'div',
      key: 'accent-bar',
      props: {
        style: {
          width: 96,
          height: 10,
          borderRadius: 999,
          background: accent,
          marginBottom: 32,
        },
      },
    },
    {
      type: 'div',
      key: 'headline',
      props: {
        style: {
          display: 'flex',
          fontSize: headlineFontSize(headline),
          fontWeight: 900,
          color: '#ffffff',
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
        },
        children: headline,
      },
    },
    ...(description
      ? [
          {
            type: 'div',
            key: 'description',
            props: {
              style: {
                display: 'flex',
                marginTop: 28,
                fontSize: 32,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.32,
              },
              children: description,
            },
          },
        ]
      : []),
  ];

  return {
    type: 'div',
    key: 'middle',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'center',
      },
      children,
    },
  };
}

function bottomBlock(cta: string, ctaText: string) {
  return {
    type: 'div',
    key: 'bottom',
    props: {
      style: { display: 'flex' },
      children: [
        {
          type: 'div',
          key: 'cta',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              color: ctaText,
              fontSize: 34,
              fontWeight: 700,
              padding: '24px 52px',
              borderRadius: 999,
            },
            children: cta,
          },
        },
      ],
    },
  };
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}
