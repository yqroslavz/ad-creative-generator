# Ad-Creative Generator

Full-stack AI tool that generates ad creatives (headline, description, CTA, image) tuned to native ad networks: **Taboola, Outbrain, MGID, TikTok Ads, RevContent, Adskeeper**.

- **Live demo:** https://ad-creative-generator-web.vercel.app
- **API:** https://ad-creative-generator-kqpw.onrender.com

Default mode is free (Gemini text + network-branded designed creatives, no card and no setup required). Bring your own Anthropic / OpenAI / DALL-E key from the settings page if you want premium AI photos.

## Features

- **6 ad networks** — network-aware prompts produce copy that fits each platform’s headline length, CTA tone, and description style.
- **$0 default mode** — Gemini 2.5 Flash copy plus a network-branded designed creative rendered in-process (`satori` + `resvg`), so the demo works for anonymous visitors with zero external dependency or cost.
- **BYOK premium** — paste your own Anthropic / OpenAI key (AES-256-GCM at rest), opt into DALL-E 3 per request.
- **Real-time progress** — SSE stream from BullMQ worker → React, status badges flip from queued → running → done.
- **CSV export** — every batch downloads as a CSV ready to paste into the ad-network UI.
- **Multi-tenant** — Clerk auth, all queries scoped by `userId` at the resolver layer.

## Architecture

```
┌──────────────┐     GraphQL/SSE    ┌──────────────────────────┐
│  Next.js 16  │ ◄────────────────► │  NestJS 11 + Apollo v4   │
│  (Vercel)    │                    │  (Render)                │
└──────┬───────┘                    └────┬─────────────────┬───┘
       │                                 │                 │
       │ Clerk JWT                       │ Prisma 6        │ BullMQ
       ▼                                 ▼                 ▼
┌──────────────┐                ┌────────────────┐   ┌────────────┐
│ Clerk Auth   │                │  Supabase      │   │  Upstash   │
└──────────────┘                │  Postgres 16   │   │  Redis     │
                                │  + Storage     │   │  (TLS)     │
                                └────────────────┘   └─────┬──────┘
                                                           │
                                              ┌────────────▼─────────────┐
                                              │  Worker (in-process)      │
                                              │  Gemini · designed SVG    │
                                              │  Anthropic · OpenAI · DALL-E │
                                              └───────────────────────────┘
```

The worker runs **in-process** with the API on Render free tier (no separate worker dyno) to stay within the $0 budget. BYOK decryption is gated by an `AsyncLocalStorage` check so it only succeeds inside the worker, never via a stray HTTP path.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 16 (App Router, RSC) · Tailwind v4 · Apollo Client v4 · Clerk v7 |
| Backend | NestJS 11 · Apollo Server v4 (`@nestjs/apollo`) · Prisma 6 |
| Database | PostgreSQL 16 (Supabase, pooled `?pgbouncer=true&connection_limit=1`) |
| Queue | BullMQ on Upstash Redis (TLS, `maxRetriesPerRequest: null`) |
| Storage | Supabase Storage via `@aws-sdk/client-s3` (`forcePathStyle: true`) |
| Auth | Clerk |
| AI text | Gemini 2.5 Flash (default) · Anthropic Claude · OpenAI GPT (BYOK) |
| AI image | Designed SVG creative via `satori` + `resvg` (default, $0) · DALL-E 3 (BYOK premium) |
| Real-time | SSE over Redis pub/sub |
| Tests | Jest 30 · Playwright |
| CI | GitHub Actions |
| Logging | Pino + `nestjs-pino` with redaction list (verified by CI test) |

## Security

BYOK keys are non-negotiable from a security perspective:

- **Encryption** — AES-256-GCM with a master key in `ENCRYPTION_KEY` (32 bytes, base64). Master key never leaves the server.
- **No leakage in GraphQL** — schema only exposes `keyPreview` (`sk-xxx-...AbCd`); `encryptedKey` is selected explicitly only inside the worker.
- **ALS-gated decryption** — `CredentialsService.getDecryptedKey()` throws `UnauthorizedException` unless called inside `workerContextStorage.run()`. Resolvers and HTTP handlers can’t reach it.
- **Logger redaction** — Pino redacts `apiKey`, `key`, `authorization`, `bearer`, `token`, `password`, `secret`, `encryptedKey`, `decryptedKey`, `rawKey`, request `Authorization` and `Cookie` headers. A CI test fails the build if any path stops redacting.
- **`no-console` lint rule** — ESLint blocks stray `console.*` in the API to ensure all output goes through the redacting logger.

This source is open — verify any of the above in [`apps/api/src/credentials`](./apps/api/src/credentials) and [`apps/api/src/logger`](./apps/api/src/logger).

## Repo layout

```
ad-creative-generator/
├── apps/
│   ├── web/    # Next.js 16 — Vercel
│   │   └── e2e/   # Playwright happy-path
│   └── api/    # NestJS 11 — Render
│       └── src/   # 5 Jest specs: BYOK service, projects resolver, prompts (snapshot), crypto, logger redaction
├── .github/workflows/ci.yml
├── docker-compose.yml   # local postgres + redis
└── pnpm-workspace.yaml
```

## Local development

### Prerequisites

- Node 22+
- pnpm 11+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker Desktop

### Setup

```bash
pnpm install
docker compose up -d                              # postgres + redis
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# fill in CLERK_*, ENCRYPTION_KEY, GEMINI_SYSTEM_KEY, etc.
pnpm --filter api exec prisma migrate dev         # create local schema
pnpm dev:api                                      # NestJS at :4000
pnpm dev:web                                      # Next.js at :3000
```

Generate the BYOK master key with `openssl rand -base64 32`.

### Tests

```bash
pnpm --filter api test                            # Jest unit tests
pnpm --filter web e2e:install                     # one-time Playwright browser install
pnpm --filter web e2e                             # happy-path E2E (needs E2E_USER_EMAIL/PASSWORD)
pnpm typecheck                                    # tsc --noEmit across the monorepo
pnpm lint                                         # eslint across the monorepo
```

E2E env: copy `apps/web/.env.e2e.example` and fill in a seed Clerk user.

### Health check

```bash
curl http://localhost:4000/health
# {"status":"ok","uptime":...,"timestamp":"..."}
```

## Environment variables

See [`apps/api/.env.example`](./apps/api/.env.example), [`apps/web/.env.local.example`](./apps/web/.env.local.example), and [`apps/web/.env.e2e.example`](./apps/web/.env.e2e.example) for the canonical list.

## Deployment

| Component | Host | Notes |
| --- | --- | --- |
| `apps/web` | Vercel (root = `apps/web`) | — |
| `apps/api` | Render free web service | Build: `pnpm install && pnpm --filter api build && pnpm --filter api exec prisma migrate deploy` · Start: `pnpm --filter api start:prod` |
| Database | Supabase Postgres | Pooled connection string with `?pgbouncer=true&connection_limit=1` |
| Redis | Upstash | TLS-only (`rediss://...`), `maxRetriesPerRequest: null` required by BullMQ |
| Storage | Supabase Storage | S3-compatible endpoint |
| Keep-alive | UptimeRobot | Pings `/health` every 5 min to defeat Render free-tier sleep |

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR and push to `main`:

- Lint (api with `--max-warnings=0`, web)
- Typecheck across the monorepo
- Jest unit tests (api)
- Playwright E2E (opt-in via `RUN_E2E=true` repo variable + Clerk/E2E secrets)

## License

MIT
