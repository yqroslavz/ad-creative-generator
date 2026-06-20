'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  CreateCheckoutSessionDocument,
  MyBalanceDocument,
} from '@/lib/graphql/operations';

export default function BillingPage() {
  const { data, loading, error } = useQuery(MyBalanceDocument);
  const [createCheckoutSession, { loading: redirecting }] = useMutation(
    CreateCheckoutSessionDocument,
  );
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setCheckoutError(null);
    try {
      const res = await createCheckoutSession({ variables: { tier: 'PRO' } });
      const url = res.data?.createCheckoutSession.url;
      if (!url) throw new Error('No checkout URL returned');
      window.location.href = url;
    } catch (err) {
      setCheckoutError((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Credits are spent each time you generate creatives. Upgrade to Pro to top up
          your balance.
        </p>
      </div>

      {loading && <div className="h-28 animate-pulse rounded-xl bg-gray-200" />}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load balance: {error.message}
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Credit balance
              </div>
              <div className="mt-1 text-3xl font-semibold tabular-nums text-gray-900">
                {data?.myBalance ?? 0}
              </div>
            </div>
            <button
              onClick={handleUpgrade}
              disabled={redirecting}
              className="shrink-0 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              {redirecting ? 'Redirecting…' : 'Upgrade to Pro'}
            </button>
          </div>
          {checkoutError && <p className="mt-3 text-sm text-red-600">{checkoutError}</p>}
        </div>
      )}
    </div>
  );
}
