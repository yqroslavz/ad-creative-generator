'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteApiKeyDocument,
  MyApiKeysDocument,
  SaveApiKeyDocument,
} from '@/lib/graphql/operations';
import type { TextProvider } from '@/lib/gql/graphql';

const PROVIDERS: {
  value: TextProvider;
  label: string;
  placeholder: string;
  badgeCls: string;
  dotCls: string;
}[] = [
  {
    value: 'ANTHROPIC',
    label: 'Anthropic',
    placeholder: 'sk-ant-…',
    badgeCls: 'bg-amber-50 text-amber-700',
    dotCls: 'bg-amber-400',
  },
  {
    value: 'OPENAI',
    label: 'OpenAI',
    placeholder: 'sk-proj-… or sk-…',
    badgeCls: 'bg-emerald-50 text-emerald-700',
    dotCls: 'bg-emerald-400',
  },
  {
    value: 'GEMINI',
    label: 'Google Gemini',
    placeholder: 'AIza…',
    badgeCls: 'bg-blue-50 text-blue-700',
    dotCls: 'bg-blue-400',
  },
];

const inputCls =
  'flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20';

export default function ApiKeysPage() {
  const { data, loading, error, refetch } = useQuery(MyApiKeysDocument);
  const [saveApiKey, { loading: saving }] = useMutation(SaveApiKeyDocument, {
    onCompleted: () => refetch(),
  });
  const [deleteApiKey, { loading: deleting }] = useMutation(DeleteApiKeyDocument, {
    onCompleted: () => refetch(),
  });

  const [inputs, setInputs] = useState<Record<TextProvider, string>>({
    ANTHROPIC: '',
    OPENAI: '',
    GEMINI: '',
  });
  const [errors, setErrors] = useState<Partial<Record<TextProvider, string>>>({});

  const savedByProvider = new Map(
    (data?.myApiKeys ?? []).map((k) => [k.provider, k]),
  );

  const handleSave = async (provider: TextProvider) => {
    const key = inputs[provider].trim();
    if (!key) return;
    setErrors((e) => ({ ...e, [provider]: undefined }));
    try {
      await saveApiKey({ variables: { input: { provider, key } } });
      setInputs((s) => ({ ...s, [provider]: '' }));
    } catch (err) {
      setErrors((e) => ({ ...e, [provider]: (err as Error).message }));
    }
  };

  const handleDelete = (provider: TextProvider) => {
    if (!confirm(`Remove your saved ${provider} key?`)) return;
    deleteApiKey({ variables: { provider } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">API keys</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bring your own keys to unlock premium models. Keys are encrypted at rest with
          AES-256-GCM, never logged, and never returned to the client.{' '}
          <a
            href="https://github.com/Hilmes04/ad-creative-generator"
            target="_blank"
            rel="noreferrer"
            className="text-violet-600 hover:underline"
          >
            Verify in source ↗
          </a>
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load keys: {error.message}
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {PROVIDERS.map(({ value, label, placeholder, badgeCls, dotCls }) => {
            const saved = savedByProvider.get(value);
            return (
              <div
                key={value}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badgeCls}`}
                    >
                      {label}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${saved ? dotCls : 'bg-gray-300'}`}
                      />
                      {saved ? (
                        <>
                          <code className="font-mono">{saved.keyPreview}</code>
                          <span className="text-gray-400">·</span>
                          {new Date(saved.createdAt).toLocaleDateString()}
                        </>
                      ) : (
                        'No key saved'
                      )}
                    </span>
                  </div>
                  {saved && (
                    <button
                      onClick={() => handleDelete(value)}
                      disabled={deleting}
                      className="shrink-0 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={placeholder}
                    value={inputs[value]}
                    onChange={(e) => setInputs((s) => ({ ...s, [value]: e.target.value }))}
                    className={inputCls}
                  />
                  <button
                    onClick={() => handleSave(value)}
                    disabled={saving || !inputs[value].trim()}
                    className="shrink-0 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                  >
                    {saved ? 'Replace' : 'Save'}
                  </button>
                </div>

                {errors[value] && (
                  <p className="mt-2 text-sm text-red-600">{errors[value]}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
