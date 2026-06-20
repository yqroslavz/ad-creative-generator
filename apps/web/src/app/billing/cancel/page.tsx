import Link from 'next/link';

export default function BillingCancelPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gray-50 px-6 py-16">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">
          Checkout canceled
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          No charge was made. You can upgrade any time.
        </p>
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
