'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type GenerationStreamEvent = {
  type: 'STATUS' | 'PING';
  status?: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  error?: string;
};

export function useGenerationStream(
  requestId: string | null,
  onTerminal: () => void,
): GenerationStreamEvent | null {
  const { getToken } = useAuth();
  const [event, setEvent] = useState<GenerationStreamEvent | null>(null);

  useEffect(() => {
    if (!requestId || !API_URL) return;
    let es: EventSource | null = null;
    let cancelled = false;

    void (async () => {
      const token = await getToken({ template: 'graphql' });
      if (cancelled || !token) return;
      const url = `${API_URL}/sse/generation/${requestId}?token=${encodeURIComponent(token)}`;
      es = new EventSource(url);

      es.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data as string) as GenerationStreamEvent;
          setEvent(parsed);
          if (
            parsed.type === 'STATUS' &&
            (parsed.status === 'SUCCEEDED' || parsed.status === 'FAILED')
          ) {
            onTerminal();
            es?.close();
          }
        } catch {
          /* ignore malformed */
        }
      };

      es.onerror = () => {
        es?.close();
      };
    })();

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [requestId, getToken, onTerminal]);

  return event;
}
