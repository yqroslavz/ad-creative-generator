# Ad-Creative Generator

Full-stack AI tool that generates ad creatives (headlines, descriptions, CTAs, and matching images) tailored to native ad networks: **Taboola, Outbrain, MGID, TikTok Ads, RevContent, Adskeeper**.

Live demo: _coming after week 1 deploy_
Open source: _this repository_

See [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) for full scope, locked stack, and 6-week plan.

## Security

Your BYOK API keys are encrypted at rest with **AES-256-GCM**. They are never logged, never displayed back to you, and never used outside your own generation requests. This source code is open — verify yourself.

## Stack

- **Frontend:** Next.js 16 (App Router, RSC) + Tailwind v4 + shadcn/ui — hosted on Vercel Hobby
- **Backend:** NestJS 11 — hosted on Render free tier
- **Database:** PostgreSQL 16 + Prisma 6 — Supabase
- **API:** GraphQL via `@nestjs/apollo` (Apollo Server v4) + Apollo Client
- **Queue:** BullMQ + Upstash Redis
- **Storage:** Supabase Storage via `@aws-sdk/client-s3`
- **Auth:** Clerk
- **AI text:** Gemini 2.0 Flash (default) / BYOK Anthropic, OpenAI, Gemini
- **AI image:** Pollinations.ai (default) / BYOK DALL-E 3 / SVG fallback via `@vercel/og`
- **Real-time:** SSE
- **Tests:** Jest + Playwright
- **CI:** GitHub Actions

## Repo layout

```
ad-creative-generator/
├── apps/
│   ├── web/    # Next.js 16
│   └── api/    # NestJS 11
├── packages/
├── docker-compose.yml    # local postgres + redis
├── pnpm-workspace.yaml
└── PROJECT_SPEC.md
```

## Local development

### Prerequisites

- Node 22+
- pnpm 11+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker Desktop

### Setup

```bash
pnpm install
docker compose up -d            # postgres + redis
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# fill in CLERK_*, ENCRYPTION_KEY, GEMINI_SYSTEM_KEY etc.
pnpm --filter api exec prisma migrate dev   # creates schema in local postgres
pnpm dev:api                    # NestJS at http://localhost:4000
pnpm dev:web                    # Next.js at http://localhost:3000
```

### Health check

```bash
curl http://localhost:4000/health
# {"status":"ok","uptime":...,"timestamp":"..."}
```

## Environment variables

See [`apps/api/.env.example`](./apps/api/.env.example) and [`apps/web/.env.local.example`](./apps/web/.env.local.example).

Generate the BYOK master key with:

```bash
openssl rand -base64 32
```

## Deployment

- **`apps/web`** → Vercel (project root = `apps/web`)
- **`apps/api`** → Render free web service (build: `pnpm install && pnpm --filter api build && pnpm --filter api exec prisma migrate deploy`, start: `pnpm --filter api start:prod`)
- **Database** → Supabase Postgres (use pooled connection string with `?pgbouncer=true&connection_limit=1`)
- **Redis** → Upstash (`maxRetriesPerRequest: null` required by BullMQ)
- **Storage** → Supabase Storage (S3-compatible endpoint)
- **Keep-alive** → UptimeRobot pings `/health` every 5 min to defeat Render free-tier sleep

## License

MIT
