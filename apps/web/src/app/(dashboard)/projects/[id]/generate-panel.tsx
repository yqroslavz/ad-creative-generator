'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  GenerateCreativesDocument,
  MyGenerationsDocument,
} from '@/lib/graphql/operations';

type Status = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

const TERMINAL: ReadonlySet<Status> = new Set(['SUCCEEDED', 'FAILED']);

const statusStyle: Record<Status, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  SUCCEEDED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export function GeneratePanel({ projectId }: { projectId: string }) {
  const [n, setN] = useState(5);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, refetch, startPolling, stopPolling } = useQuery(
    MyGenerationsDocument,
    {
      variables: { projectId },
      fetchPolicy: 'cache-and-network',
    },
  );

  const hasActive = useMemo(
    () =>
      data?.myGenerations.some(
        (g) => !TERMINAL.has(g.status as Status),
      ) ?? false,
    [data],
  );

  if (hasActive) startPolling(3000);
  else stopPolling();

  const [generate, { loading: submitting }] = useMutation(
    GenerateCreativesDocument,
    {
      onCompleted: () => {
        setErrorMsg(null);
        startPolling(3000);
        void refetch();
      },
      onError: (err) => setErrorMsg(err.message),
    },
  );

  const handleGenerate = () => {
    setErrorMsg(null);
    void generate({ variables: { input: { projectId, n } } });
  };

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Generate creatives</h2>
          <p className="text-sm text-gray-500">
            Pick how many variants you want. Gemini ($0 mode) writes the copy.
          </p>
        </div>
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
          <button
            onClick={handleGenerate}
            disabled={submitting}
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? 'Queuing…' : `Generate ${n}`}
          </button>
        </div>
      </div>

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
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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
              <time className="text-xs text-gray-500">
                {new Date(g.createdAt).toLocaleString()}
              </time>
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
                    className="rounded-md border border-gray-100 bg-gray-50 p-3"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {c.headline}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      {c.description}
                    </p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                      CTA: {c.cta}
                    </p>
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
