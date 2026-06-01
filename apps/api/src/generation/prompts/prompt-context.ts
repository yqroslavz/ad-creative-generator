export interface PromptContext {
  offer: string;
  audience: string;
  landingPageUrl: string | null;
}

export type PromptBuilder = (ctx: PromptContext) => string;

export function formatContext(ctx: PromptContext): string {
  const lines = [`Offer: ${ctx.offer}`, `Target audience: ${ctx.audience}`];
  if (ctx.landingPageUrl) lines.push(`Landing page: ${ctx.landingPageUrl}`);
  return lines.join('\n');
}
