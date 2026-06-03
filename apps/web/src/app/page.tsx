import { Show, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

const NETWORKS = ['Taboola', 'Outbrain', 'MGID', 'TikTok', 'RevContent', 'Adskeeper'];

const FEATURES = [
  {
    icon: '🎯',
    title: '6 native ad networks',
    body: "Network-aware prompts hit each platform's headline/description/CTA limits and tone — no generic copy.",
  },
  {
    icon: '💸',
    title: '$0 default mode',
    body: 'Gemini text + Pollinations images out of the box. No card required. Bring your Anthropic / OpenAI / DALL-E key only if you want premium output.',
  },
  {
    icon: '⚡',
    title: 'Real-time progress',
    body: 'Jobs stream over SSE: queued → running → done. Download every batch as a CSV ready for the ad network UI.',
  },
];

export default function Home() {
  return (
    <main className="flex-1 bg-white">
      <section className="relative overflow-hidden bg-gradient-to-b from-violet-50/70 via-white to-white px-6 py-20 text-center sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(139,92,246,0.1),transparent)]" />
        <p className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          $0 mode · BYOK optional · Open source
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          Ship ad creatives that fit{' '}
          <span className="text-violet-600">the network you&apos;re buying on.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Generate headline + description + CTA + image variants for native ad networks in
          seconds. Built for testing dozens of angles without burning hours in Figma.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700">
                Try it free
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
            >
              Go to dashboard
            </Link>
          </Show>
          <a
            href="https://github.com/Hilmes04/ad-creative-generator"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Source on GitHub
          </a>
        </div>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {NETWORKS.map((n) => (
            <li
              key={n}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 shadow-sm"
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
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-xl">
                {f.icon}
              </div>
              <h2 className="text-base font-semibold text-gray-900">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-gray-900">Your API keys, your control</h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          BYOK keys are encrypted with AES-256-GCM and a server-side master key before they
          touch the database. The GraphQL API never returns the ciphertext — only a 4-char
          preview. Decryption happens exclusively inside the background worker that calls the
          provider, gated by an{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs font-mono">
            AsyncLocalStorage
          </code>{' '}
          check. Logger redaction is enforced by a CI test.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          You can delete a key from the dashboard at any time. The full source is on GitHub if
          you want to verify any of this.
        </p>
      </section>

      <section className="bg-zinc-900">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-6 py-14 sm:flex-row">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Spin up a batch in under a minute.
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Sign in with Google. No card. Default mode is free forever.
            </p>
          </div>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="shrink-0 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700">
                Get started
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="shrink-0 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
            >
              Open dashboard
            </Link>
          </Show>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-8 text-center text-xs text-gray-400">
        Built as a portfolio project. Not affiliated with any ad network.
      </footer>
    </main>
  );
}
