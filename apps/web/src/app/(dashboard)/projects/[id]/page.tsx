'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { ProjectDocument } from '@/lib/graphql/operations';
import { GeneratePanel } from './generate-panel';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error } = useQuery(ProjectDocument, { variables: { id } });

  if (loading)
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded-md bg-gray-200" />
        <div className="h-40 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load: {error.message}
      </div>
    );
  if (!data?.project)
    return <p className="text-sm text-gray-500">Project not found.</p>;

  const p = data.project;

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Back to projects
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{p.name}</h1>
        <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
          {p.adNetwork}
        </span>
      </div>

      <dl className="grid gap-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <Row label="Offer description">{p.offerDescription}</Row>
        <Row label="Target audience">{p.targetAudience}</Row>
        <Row label="Landing page">
          {p.landingPageUrl ? (
            <a
              href={p.landingPageUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-violet-600 hover:text-violet-700 hover:underline"
            >
              {p.landingPageUrl}
            </a>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </Row>
        <Row label="Created">{new Date(p.createdAt).toLocaleString()}</Row>
      </dl>

      <GeneratePanel projectId={p.id} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}
