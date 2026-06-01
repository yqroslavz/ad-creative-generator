import { Show, SignInButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-xl text-center space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight">Ad-Creative Generator</h1>
        <p className="text-lg text-gray-600">
          AI-generated ad creatives tailored to Taboola, Outbrain, MGID, TikTok,
          RevContent and Adskeeper.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-full bg-black text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800">
                Try it free
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-full bg-black text-white px-5 py-2.5 text-sm font-medium hover:bg-gray-800"
            >
              Go to dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </main>
  );
}
