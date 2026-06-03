import type { AdNetwork } from '@prisma/client';
import { buildPrompt, type PromptContext } from './index';

const NETWORKS: AdNetwork[] = [
  'TABOOLA',
  'OUTBRAIN',
  'MGID',
  'TIKTOK',
  'REVCONTENT',
  'ADSKEEPER',
];

const baseCtx: PromptContext = {
  offer: 'Smart sleep tracker ring, 14-day battery',
  audience: 'Adults 30-55 with mild insomnia and an Oura/Apple Watch habit',
  landingPageUrl: 'https://example.com/ring',
};

describe('buildPrompt', () => {
  describe.each(NETWORKS)('network %s', (network) => {
    it('matches snapshot with full context', () => {
      expect(buildPrompt(network, baseCtx)).toMatchSnapshot();
    });

    it('omits landing line when landingPageUrl is null', () => {
      const out = buildPrompt(network, { ...baseCtx, landingPageUrl: null });
      expect(out).not.toMatch(/Landing page:/i);
    });

    it('embeds offer and audience verbatim', () => {
      const out = buildPrompt(network, baseCtx);
      expect(out).toContain(baseCtx.offer);
      expect(out).toContain(baseCtx.audience);
    });
  });
});
