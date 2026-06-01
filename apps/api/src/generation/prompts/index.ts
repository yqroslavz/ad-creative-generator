import type { AdNetwork } from '@prisma/client';
import { adskeeperPrompt } from './adskeeper';
import { mgidPrompt } from './mgid';
import { outbrainPrompt } from './outbrain';
import type { PromptBuilder, PromptContext } from './prompt-context';
import { revcontentPrompt } from './revcontent';
import { taboolaPrompt } from './taboola';
import { tiktokPrompt } from './tiktok';

const BUILDERS: Record<AdNetwork, PromptBuilder> = {
  TABOOLA: taboolaPrompt,
  OUTBRAIN: outbrainPrompt,
  MGID: mgidPrompt,
  TIKTOK: tiktokPrompt,
  REVCONTENT: revcontentPrompt,
  ADSKEEPER: adskeeperPrompt,
};

export function buildPrompt(network: AdNetwork, ctx: PromptContext): string {
  return BUILDERS[network](ctx);
}

export type { PromptContext } from './prompt-context';
