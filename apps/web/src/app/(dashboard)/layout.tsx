import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Ad-Creative Generator
          </Link>
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/dashboard" className="hover:text-black">
              Projects
            </Link>
            <Link href="/settings/api-keys" className="hover:text-black">
              API keys
            </Link>
            <UserButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
