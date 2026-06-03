import { Show, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

const NETWORKS = [
  'Taboola',
  'Outbrain',
  'MGID',
  'TikTok',
  'RevContent',
  'Adskeeper',
];

const FEATURES = [
  {
    title: '6 native ad networks',
    body: 'Network-aware prompts hit each platform’s headline/description/CTA limits and tone — no generic copy.',
  },
  {
    title: '$0 default mode',
    body: 'Gemini text + Pollinations images out of the box. No card required. Bring your Anthropic / OpenAI / DALL-E key only if you want premium output.',
  },
  {
    title: 'Real-time progress',
    body: 'Jobs stream over SSE: queued → running → done. Download every batch as a CSV ready for the ad network UI.',
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-24">
        <p className="mb-4 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          $0 mode · BYOK optional · Open source
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Ship ad creatives that fit
          <br className="hidden sm:inline" /> the network you’re buying on.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
          Generate headline + description + CTA + image variants for native ad
          networks in seconds. Built for testing dozens of angles without
          burning hours in Figma.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800">
                Try it free
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Go to dashboard
            </Link>
          </Show>
          <a
            href="https://github.com/Hilmes04/ad-creative-generator"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Source on GitHub
          </a>
        </div>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500">
          {NETWORKS.map((n) => (
            <li
              key={n}
              className="rounded-full border border-gray-200 px-3 py-1"
            >
              {n}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-16 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <h2 className="text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-semibold">Your API keys, your control</h2>
        <p className="mt-3 text-sm text-gray-600">
          BYOK keys are encrypted with AES-256-GCM and a server-side master key
          before they touch the database. The GraphQL API never returns the
          ciphertext — only a 4-char preview. Decryption happens exclusively
          inside the background worker that calls the provider, gated by an{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
            AsyncLocalStorage
          </code>{' '}
          check. Logger redaction is enforced by a CI test.
        </p>
        <p className="mt-3 text-sm text-gray-600">
          You can delete a key from the dashboard at any time. The full source
          is on GitHub if you want to verify any of this.
        </p>
      </section>

      <section className="border-t border-gray-100 bg-black text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-12 sm:flex-row">
          <div>
            <h2 className="text-xl font-semibold">
              Spin up a batch in under a minute.
            </h2>
            <p className="mt-1 text-sm text-gray-300">
              Sign in with Google. No card. Default mode is free forever.
            </p>
          </div>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-gray-200">
                Get started
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-gray-200"
            >
              Open dashboard
            </Link>
          </Show>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-gray-500">
        Built as a portfolio project. Not affiliated with any ad network.
      </footer>
    </main>
  );
}
