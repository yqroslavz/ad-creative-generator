'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { ProjectDocument } from '@/lib/graphql/operations';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error } = useQuery(ProjectDocument, { variables: { id } });

  if (loading) return <p className="text-gray-500">Loading…</p>;
  if (error) return <p className="text-red-600">Failed to load: {error.message}</p>;
  if (!data?.project) return <p className="text-gray-500">Project not found.</p>;

  const p = data.project;

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-gray-600 hover:underline">
        ← Back to dashboard
      </Link>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
        <p className="text-sm text-gray-500">{p.adNetwork}</p>
      </div>

      <dl className="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:grid-cols-2">
        <Row label="Offer description">{p.offerDescription}</Row>
        <Row label="Target audience">{p.targetAudience}</Row>
        <Row label="Landing page">
          {p.landingPageUrl ? (
            <a
              href={p.landingPageUrl}
              target="_blank"
              rel="noreferrer"
              className="text-black underline"
            >
              {p.landingPageUrl}
            </a>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </Row>
        <Row label="Created">{new Date(p.createdAt).toLocaleString()}</Row>
      </dl>

      <p className="text-sm text-gray-500">
        Creative generation coming in Week 3.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{children}</dd>
    </div>
  );
}
