'use client';

import { useAuth } from '@clerk/nextjs';
import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GenerateCreativesDocument,
  MyApiKeysDocument,
  MyGenerationsDocument,
  RegenerateCreativeDocument,
  RetryGenerationDocument,
} from '@/lib/graphql/operations';
import type { ImageMode, TextProvider } from '@/lib/gql/graphql';
import { useGenerationStream } from '@/lib/use-generation-stream';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Status = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

const TERMINAL: ReadonlySet<Status> = new Set(['SUCCEEDED', 'FAILED']);

const statusStyle: Record<Status, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  SUCCEEDED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const imageModeLabel: Record<ImageMode, string> = {
  POLLINATIONS: 'AI image',
  BYOK_DALLE: 'Premium AI',
  SVG_FALLBACK: 'Preview',
};

const TEXT_PROVIDERS: { value: TextProvider; label: string; byok: boolean }[] =
  [
    { value: 'GEMINI', label: 'Gemini ($0 mode)', byok: false },
    { value: 'ANTHROPIC', label: 'Anthropic (BYOK)', byok: true },
    { value: 'OPENAI', label: 'OpenAI (BYOK)', byok: true },
  ];

export function GeneratePanel({ projectId }: { projectId: string }) {
  const [n, setN] = useState(5);
  const [textProvider, setTextProvider] = useState<TextProvider>('GEMINI');
  const [premiumImage, setPremiumImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { getToken } = useAuth();
  const { data, refetch } = useQuery(MyGenerationsDocument, {
    variables: { projectId },
    fetchPolicy: 'cache-and-network',
  });
  const { data: keysData } = useQuery(MyApiKeysDocument);

  const savedProviders = useMemo(
    () => new Set(keysData?.myApiKeys.map((k) => k.provider) ?? []),
    [keysData],
  );
  const hasOpenAIKey = savedProviders.has('OPENAI');

  const activeRequestId = useMemo(
    () =>
      data?.myGenerations.find((g) => !TERMINAL.has(g.status as Status))?.id ??
      null,
    [data],
  );

  const handleTerminal = useCallback(() => {
    void refetch();
  }, [refetch]);

  useGenerationStream(activeRequestId, handleTerminal);

  const [generate, { loading: submitting }] = useMutation(
    GenerateCreativesDocument,
    {
      onCompleted: () => {
        setErrorMsg(null);
        void refetch();
      },
      onError: (err) => setErrorMsg(err.message),
    },
  );

  const [regenerate, { loading: regenLoading }] = useMutation(
    RegenerateCreativeDocument,
    {
      onCompleted: () => {
        setErrorMsg(null);
        void refetch();
      },
      onError: (err) => setErrorMsg(err.message),
    },
  );

  const [retry, { loading: retryLoading }] = useMutation(
    RetryGenerationDocument,
    {
      onCompleted: () => {
        setErrorMsg(null);
        void refetch();
      },
      onError: (err) => setErrorMsg(err.message),
    },
  );

  const handleGenerate = () => {
    setErrorMsg(null);
    const imageMode: ImageMode | null =
      premiumImage && hasOpenAIKey ? 'BYOK_DALLE' : null;
    void generate({
      variables: {
        input: { projectId, n, textProvider, imageMode },
      },
    });
  };

  const handleDownloadCsv = useCallback(
    async (id: string) => {
      if (!API_URL) return;
      const token = await getToken({ template: 'graphql' });
      if (!token) return;
      const url = `${API_URL}/export/generation/${id}.csv?token=${encodeURIComponent(token)}`;
      window.open(url, '_blank');
    },
    [getToken],
  );

  const selectedProviderInfo = TEXT_PROVIDERS.find(
    (p) => p.value === textProvider,
  );
  const byokMissing =
    selectedProviderInfo?.byok && !savedProviders.has(textProvider);

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Generate creatives</h2>
          <p className="text-sm text-gray-500">
            Choose a provider and how many variants you want.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="provider" className="text-sm text-gray-700">
              Text
            </label>
            <select
              id="provider"
              value={textProvider}
              onChange={(e) => setTextProvider(e.target.value as TextProvider)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              {TEXT_PROVIDERS.map((p) => (
                <option
                  key={p.value}
                  value={p.value}
                  disabled={p.byok && !savedProviders.has(p.value)}
                >
                  {p.label}
                  {p.byok && !savedProviders.has(p.value) ? ' — add key' : ''}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={premiumImage}
              onChange={(e) => setPremiumImage(e.target.checked)}
              disabled={!hasOpenAIKey}
            />
            Premium image (DALL-E)
            {!hasOpenAIKey && (
              <span className="text-xs text-gray-400">add OpenAI key</span>
            )}
          </label>

          <div className="flex items-center gap-2">
            <label htmlFor="n" className="text-sm text-gray-700">
              Variants
            </label>
            <input
              id="n"
              type="number"
              min={1}
              max={10}
              value={n}
              onChange={(e) =>
                setN(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
              }
              className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={submitting || byokMissing}
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? 'Queuing…' : `Generate ${n}`}
          </button>
        </div>
      </div>

      {byokMissing && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Add a {textProvider} key in <code>/settings/api-keys</code> to use
          this provider.
        </p>
      )}

      {errorMsg && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <div className="space-y-3">
        {data?.myGenerations.length === 0 && (
          <p className="text-sm text-gray-500">No generations yet.</p>
        )}
        {data?.myGenerations.map((g) => (
          <article
            key={g.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <header className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusStyle[g.status as Status]
                  }`}
                >
                  {g.status}
                </span>
                <span className="text-sm text-gray-700">
                  {g.n} variants
                </span>
                {g.textProviderUsed && (
                  <span className="text-xs text-gray-500">
                    via {g.textProviderUsed}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {g.status === 'SUCCEEDED' && g.creatives.length > 0 && (
                  <button
                    onClick={() => void handleDownloadCsv(g.id)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Download CSV
                  </button>
                )}
                {g.status === 'FAILED' && (
                  <button
                    onClick={() =>
                      void retry({ variables: { id: g.id } })
                    }
                    disabled={retryLoading}
                    className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                  >
                    Retry
                  </button>
                )}
                <time className="text-xs text-gray-500">
                  {new Date(g.createdAt).toLocaleString()}
                </time>
              </div>
            </header>

            {g.error && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                {g.error}
              </p>
            )}

            {g.creatives.length > 0 && (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {g.creatives.map((c) => (
                  <li
                    key={c.id}
                    className="overflow-hidden rounded-md border border-gray-100 bg-gray-50"
                  >
                    <div className="relative aspect-square w-full bg-gray-200">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.imageUrl}
                          alt={c.headline}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                          {g.status === 'RUNNING' ? 'Generating…' : 'No image'}
                        </div>
                      )}
                      {g.imageModeUsed && c.imageUrl && (
                        <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                          {imageModeLabel[g.imageModeUsed as ImageMode]}
                        </span>
                      )}
                      {g.status === 'SUCCEEDED' && (
                        <button
                          onClick={() =>
                            void regenerate({
                              variables: { creativeId: c.id },
                            })
                          }
                          disabled={regenLoading}
                          className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-gray-800 shadow hover:bg-white disabled:opacity-50"
                        >
                          Regenerate image
                        </button>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {c.headline}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {c.description}
                      </p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                        CTA: {c.cta}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
