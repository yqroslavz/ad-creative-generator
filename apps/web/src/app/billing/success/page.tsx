'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { MyBalanceDocument } from '@/lib/graphql/operations';

export default function BillingSuccessPage() {
  const { data, loading, error, startPolling, stopPolling } = useQuery(
    MyBalanceDocument,
    { fetchPolicy: 'network-only' },
  );

  useEffect(() => {
    startPolling(2000);
    const timer = setTimeout(() => stopPolling(), 30000);
    return () => {
      stopPolling();
      clearTimeout(timer);
    };
  }, [startPolling, stopPolling]);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gray-50 px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-lg font-semibold text-emerald-600">
          ✓
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-gray-900">
          Payment successful
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Your credits are being added. This balance updates automatically.
        </p>

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Credit balance
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-gray-900">
            {error ? '—' : (data?.myBalance ?? 0)}
          </div>
          {loading && !data && <div className="mt-1 text-xs text-gray-400">Loading…</div>}
        </div>

        <Link
          href="/settings/billing"
          className="mt-6 inline-block rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        >
          Back to billing
        </Link>
      </div>
    </div>
  );
}
