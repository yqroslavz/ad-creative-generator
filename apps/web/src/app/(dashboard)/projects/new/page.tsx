'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { CreateProjectDocument } from '@/lib/graphql/operations';

const AD_NETWORKS = ['TABOOLA', 'OUTBRAIN', 'MGID', 'TIKTOK', 'REVCONTENT', 'ADSKEEPER'] as const;
type AdNetwork = (typeof AD_NETWORKS)[number];

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [adNetwork, setAdNetwork] = useState<AdNetwork>('TABOOLA');
  const [landingPageUrl, setLandingPageUrl] = useState('');

  const [createProject, { loading, error }] = useMutation(CreateProjectDocument, {
    refetchQueries: ['Projects'],
    onCompleted: () => router.push('/dashboard'),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    createProject({
      variables: {
        input: {
          name,
          offerDescription,
          targetAudience,
          adNetwork,
          landingPageUrl: landingPageUrl || null,
        },
      },
    });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">New project</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Set up your campaign details to start generating creatives
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <Field label="Name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer Sale Campaign"
            className={inputCls}
          />
        </Field>

        <Field label="Offer description">
          <textarea
            required
            value={offerDescription}
            onChange={(e) => setOfferDescription(e.target.value)}
            rows={3}
            placeholder="What are you promoting? Include key benefits and value proposition."
            className={inputCls}
          />
        </Field>

        <Field label="Target audience">
          <textarea
            required
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            rows={2}
            placeholder="e.g. Home owners aged 35-55 interested in home improvement"
            className={inputCls}
          />
        </Field>

        <Field label="Ad network">
          <select
            value={adNetwork}
            onChange={(e) => setAdNetwork(e.target.value as AdNetwork)}
            className={inputCls}
          >
            {AD_NETWORKS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Landing page URL (optional)">
          <input
            type="url"
            value={landingPageUrl}
            onChange={(e) => setLandingPageUrl(e.target.value)}
            placeholder="https://example.com"
            className={inputCls}
          />
        </Field>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
