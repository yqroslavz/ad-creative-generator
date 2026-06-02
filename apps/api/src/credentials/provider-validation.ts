import type { TextProvider } from '@prisma/client';

const PING_TIMEOUT_MS = 8000;

async function pingWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function pingGemini(rawKey: string): Promise<void> {
  const res = await pingWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(rawKey)}`,
    { method: 'GET' },
  );
  if (!res.ok) {
    throw new Error(`Gemini key rejected (HTTP ${res.status})`);
  }
}

async function pingAnthropic(rawKey: string): Promise<void> {
  const res = await pingWithTimeout('https://api.anthropic.com/v1/models', {
    method: 'GET',
    headers: {
      'x-api-key': rawKey,
      'anthropic-version': '2023-06-01',
    },
  });
  if (!res.ok) {
    throw new Error(`Anthropic key rejected (HTTP ${res.status})`);
  }
}

async function pingOpenAI(rawKey: string): Promise<void> {
  const res = await pingWithTimeout('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: { Authorization: `Bearer ${rawKey}` },
  });
  if (!res.ok) {
    throw new Error(`OpenAI key rejected (HTTP ${res.status})`);
  }
}

export async function validateProviderKey(
  provider: TextProvider,
  rawKey: string,
): Promise<void> {
  switch (provider) {
    case 'GEMINI':
      return pingGemini(rawKey);
    case 'ANTHROPIC':
      return pingAnthropic(rawKey);
    case 'OPENAI':
      return pingOpenAI(rawKey);
    default: {
      const exhaustive: never = provider;
      throw new Error(`Unknown provider: ${String(exhaustive)}`);
    }
  }
}
