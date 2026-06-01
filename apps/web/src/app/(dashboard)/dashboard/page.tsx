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
        <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
        <Link
          href="/projects/new"
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          New project
        </Link>
      </div>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error && <p className="text-red-600">Failed to load projects: {error.message}</p>}

      {data && data.projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-600">No projects yet.</p>
          <Link
            href="/projects/new"
            className="mt-3 inline-block text-sm font-medium text-black underline"
          >
            Create your first project
          </Link>
        </div>
      )}

      {data && data.projects.length > 0 && (
        <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
          {data.projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <Link
                  href={`/projects/${p.id}`}
                  className="block truncate text-base font-medium hover:underline"
                >
                  {p.name}
                </Link>
                <p className="text-sm text-gray-500">{p.adNetwork}</p>
              </div>
              <button
                onClick={() => handleDelete(p.id, p.name)}
                disabled={deleting}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
