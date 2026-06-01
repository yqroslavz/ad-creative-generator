'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteApiKeyDocument,
  MyApiKeysDocument,
  SaveApiKeyDocument,
} from '@/lib/graphql/operations';
import type { TextProvider } from '@/lib/gql/graphql';

const PROVIDERS: { value: TextProvider; label: string; placeholder: string }[] =
  [
    { value: 'ANTHROPIC', label: 'Anthropic', placeholder: 'sk-ant-...' },
    { value: 'OPENAI', label: 'OpenAI', placeholder: 'sk-proj-... or sk-...' },
    { value: 'GEMINI', label: 'Google Gemini', placeholder: 'AIza...' },
  ];

export default function ApiKeysPage() {
  const { data, loading, error, refetch } = useQuery(MyApiKeysDocument);
  const [saveApiKey, { loading: saving }] = useMutation(SaveApiKeyDocument, {
    onCompleted: () => refetch(),
  });
  const [deleteApiKey, { loading: deleting }] = useMutation(
    DeleteApiKeyDocument,
    { onCompleted: () => refetch() },
  );

  const [inputs, setInputs] = useState<Record<TextProvider, string>>({
    ANTHROPIC: '',
    OPENAI: '',
    GEMINI: '',
  });
  const [errors, setErrors] = useState<Partial<Record<TextProvider, string>>>(
    {},
  );

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
      setErrors((e) => ({
        ...e,
        [provider]: (err as Error).message,
      }));
    }
  };

  const handleDelete = (provider: TextProvider) => {
    if (!confirm(`Remove your saved ${provider} key?`)) return;
    deleteApiKey({ variables: { provider } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bring your own keys to use premium models. Your keys are encrypted
          at rest with AES-256-GCM, never logged, and never displayed back to
          you. The source code is open — verify yourself.
        </p>
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && (
        <p className="text-red-600">Failed to load keys: {error.message}</p>
      )}

      {!loading && (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
          {PROVIDERS.map(({ value, label, placeholder }) => {
            const saved = savedByProvider.get(value);
            return (
              <li key={value} className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-medium">{label}</h2>
                    {saved ? (
                      <p className="text-sm text-gray-500">
                        Saved: <code>{saved.keyPreview}</code> ·{' '}
                        {new Date(saved.createdAt).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">No key saved</p>
                    )}
                  </div>
                  {saved && (
                    <button
                      onClick={() => handleDelete(value)}
                      disabled={deleting}
                      className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder={placeholder}
                    value={inputs[value]}
                    onChange={(e) =>
                      setInputs((s) => ({ ...s, [value]: e.target.value }))
                    }
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
                  />
                  <button
                    onClick={() => handleSave(value)}
                    disabled={saving || !inputs[value].trim()}
                    className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {saved ? 'Replace' : 'Save'}
                  </button>
                </div>

                {errors[value] && (
                  <p className="text-sm text-red-600">{errors[value]}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
