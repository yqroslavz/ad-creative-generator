'use client';

import Link from 'next/link';
import { useMutation, useQuery } from '@apollo/client/react';
import { ProjectsDocument, DeleteProjectDocument } from '@/lib/graphql/operations';

export default function DashboardPage() {
  const { data, loading, error, refetch } = useQuery(ProjectsDocument);
  const [deleteProject, { loading: deleting }] = useMutation(DeleteProjectDocument, {
    onCompleted: () => refetch(),
  });

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"?`)) return;
    deleteProject({ variables: { id } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Projects</h1>
          <p className="mt-0.5 text-sm text-gray-500">Manage your ad creative campaigns</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        >
          + New project
        </Link>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load projects: {error.message}
        </div>
      )}

      {data && data.projects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-2xl">
            🎨
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first campaign</p>
          <Link
            href="/projects/new"
            className="mt-4 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
          >
            Create project
          </Link>
        </div>
      )}

      {data && data.projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.projects.map((p) => (
            <div
              key={p.id}
              className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                  {p.adNetwork}
                </span>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  disabled={deleting}
                  className="rounded-md p-1 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:pointer-events-none"
                  title="Delete project"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <Link href={`/projects/${p.id}`} className="mt-3 flex-1">
                <h3 className="font-semibold text-gray-900 transition-colors group-hover:text-violet-700">
                  {p.name}
                </h3>
              </Link>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <Link
                  href={`/projects/${p.id}`}
                  className="text-xs font-medium text-violet-600 hover:text-violet-700"
                >
                  Open →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
