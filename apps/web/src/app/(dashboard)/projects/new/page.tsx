'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { CreateProjectDocument } from '@/lib/graphql/operations';

const AD_NETWORKS = ['TABOOLA', 'OUTBRAIN', 'MGID', 'TIKTOK', 'REVCONTENT', 'ADSKEEPER'] as const;
type AdNetwork = (typeof AD_NETWORKS)[number];

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
      <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
        <Field label="Name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </Field>

        <Field label="Offer description">
          <textarea
            required
            value={offerDescription}
            onChange={(e) => setOfferDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </Field>

        <Field label="Target audience">
          <textarea
            required
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </Field>

        <Field label="Ad network">
          <select
            value={adNetwork}
            onChange={(e) => setAdNetwork(e.target.value as AdNetwork)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error.message}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
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
