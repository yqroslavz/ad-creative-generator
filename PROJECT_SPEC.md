# Ad-Creative Generator — Project Spec

> Single source of truth for scope, stack, and milestones.
> Living document. Update the Decisions log when changing anything locked.

## Goal

Build and publicly deploy a full-stack AI tool that generates ad creatives (headlines, descriptions, CTAs, and matching images) tailored to specific native ad networks: Taboola, Outbrain, MGID, TikTok Ads, RevContent, Adskeeper. The user enters an offer description, target audience, and network; the system returns N creative variants formatted to the network's constraints.

**Output:** live demo URL + open GitHub repo, used as a portfolio piece for job applications and as a seed for potential micro-SaaS.

**Non-goals:** see *Out of scope*.

## Constraints

1. **Zero recurring cost during development and demo phase.** No credit cards required for any service. Cost discipline is a first-class constraint, not a secondary concern.
2. **Demo must work for unauthenticated visitors out of the box.** Recruiters must not be asked to provide API keys to see the product working.
3. **Source code is fully open.** Trust model for BYOK depends on this.

## Why this exact stack

Every layer below either closes a recurring gap in the author's active job pipeline (Next.js, PostgreSQL, GraphQL, cloud storage SDK, event-driven queues, real-time, secrets management, public AI demo, E2E tests) or sits in the author's domain of expertise (native ad networks, AI integration). No layer is here for novelty.

## Stack — LOCKED ($0 mode)

| Layer | Technology | Free tier | Card required? |
|---|---|---|---|
| Frontend | Next.js 15 (App Router, RSC) + Tailwind + shadcn/ui | Vercel Hobby | No |
| Backend | NestJS 11 | Render free web service | No |
| Database | PostgreSQL 16 + Prisma | Supabase Postgres (500MB) | No |
| API layer | GraphQL via `@nestjs/apollo` (Apollo Server v4) + Apollo Client | — | — |
| Queue | BullMQ | Upstash Redis (10k cmd/day) | No |
| Storage | `@aws-sdk/client-s3` → Supabase Storage S3-compatible endpoint | Supabase Storage (1GB) | No |
| Auth | Clerk | Free tier (10k MAU) | No |
| AI text (default) | Google Gemini 2.0 Flash via system key | 1500 req/day | No |
| AI text (BYOK) | Anthropic / OpenAI / Gemini — user-provided, encrypted at rest | — | No |
| AI image (default) | Pollinations.ai HTTP API | Free, no key | No |
| AI image (BYOK premium) | OpenAI DALL-E 3 — user-provided | — | No |
| AI image (fallback) | SVG generation via `@vercel/og` / satori | Free | No |
| Real-time | Server-Sent Events for job progress | — | — |
| Tests | Jest (unit) + Playwright (E2E) | — | — |
| CI | GitHub Actions | 2000 min/mo | No |
| Containerization | Docker Compose (local dev only) | — | — |
| Anti-sleep | UptimeRobot ping every 5 min | Free | No |
| Lang | TypeScript strict everywhere | — | — |

Changing anything in this table requires updating the *Decisions log* below with the trade-off.

## Architecture

```
                      ┌───────────────────────────┐
                      │  Next.js — Vercel         │
                      │  ───────────────────────  │
                      │  • App Router + RSC       │
                      │  • Apollo Client          │
                      │  • EventSource (SSE)      │
                      │  • Clerk middleware       │
                      └────────┬──────────────────┘
                               │ GraphQL + SSE (HTTPS)
                               ▼
                      ┌───────────────────────────┐
                      │  NestJS — Render          │
                      │  ───────────────────────  │
                      │  • Apollo gateway         │
                      │  • Resolvers              │
                      │  • Throttler (IP + user)  │
                      │  • BullMQ producer        │
                      │  • SSE controller         │
                      │  • Clerk JWT verify       │
                      │  • CredentialsService     │
                      │    (AES-256-GCM)          │
                      └────┬────────────────┬─────┘
                           │                │
                  ┌────────▼───────┐   ┌────▼─────────────────────┐
                  │  Supabase      │   │  BullMQ Worker           │
                  │  Postgres      │   │  (same NestJS app,       │
                  └────────────────┘   │   separate process)      │
                                       │  ───────────────────     │
                                       │  • AITextProvider        │
                                       │    (Gemini / BYOK)       │
                                       │  • ImageProvider         │
                                       │    (Pollinations /       │
                                       │     BYOK DALL-E /        │
                                       │     SVG fallback)        │
                                       │  • Storage upload        │
                                       │  • Postgres write        │
                                       │  • Redis pub/sub emit    │
                                       └────┬────────────────┬────┘
                                            │                │
                                   ┌────────▼─────┐   ┌──────▼──────────┐
                                   │  Upstash     │   │  Supabase       │
                                   │  Redis       │   │  Storage (S3)   │
                                   └──────────────┘   └─────────────────┘
```

## Repo layout

```
ad-creative-generator/
├── apps/
│   ├── web/                              # Next.js
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── projects/
│   │   │   │   ├── projects/[id]/
│   │   │   │   └── settings/api-keys/
│   │   │   └── api/                      # webhooks only
│   │   ├── lib/
│   │   │   ├── apollo.ts
│   │   │   └── sse.ts
│   │   └── components/
│   └── api/                              # NestJS
│       ├── src/
│       │   ├── auth/
│       │   ├── projects/
│       │   ├── credentials/              # BYOK service
│       │   │   ├── credentials.service.ts
│       │   │   ├── credentials.resolver.ts
│       │   │   └── crypto.util.ts
│       │   ├── generation/
│       │   │   ├── generation.module.ts
│       │   │   ├── generation.resolver.ts
│       │   │   ├── generation.service.ts
│       │   │   ├── generation.processor.ts   # BullMQ worker
│       │   │   ├── providers/
│       │   │   │   ├── text/
│       │   │   │   │   ├── ai-text.provider.ts      # interface
│       │   │   │   │   ├── gemini.provider.ts
│       │   │   │   │   ├── anthropic.provider.ts
│       │   │   │   │   └── openai.provider.ts
│       │   │   │   └── image/
│       │   │   │       ├── image.provider.ts        # interface
│       │   │   │       ├── pollinations.provider.ts
│       │   │   │       ├── dalle.provider.ts
│       │   │   │       └── svg-fallback.provider.ts
│       │   │   ├── prompts/
│       │   │   │   ├── taboola.ts
│       │   │   │   ├── outbrain.ts
│       │   │   │   ├── mgid.ts
│       │   │   │   ├── tiktok.ts
│       │   │   │   ├── revcontent.ts
│       │   │   │   └── adskeeper.ts
│       │   │   └── sse.controller.ts
│       │   ├── storage/
│       │   │   └── s3.service.ts                    # @aws-sdk/client-s3 → Supabase
│       │   ├── throttle/
│       │   │   └── ip-throttler.guard.ts
│       │   └── prisma/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── test/
├── packages/
│   └── graphql-types/                    # generated, shared between apps
├── docker-compose.yml                    # postgres + redis for local
├── pnpm-workspace.yaml
└── PROJECT_SPEC.md
```

## Data model (Prisma sketch)

```prisma
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  projects  Project[]
  apiKeys   UserApiKey[]
}

enum AiProvider {
  ANTHROPIC
  OPENAI
  GEMINI
}

model UserApiKey {
  id           String     @id @default(cuid())
  userId       String
  user         User       @relation(fields: [userId], references: [id])
  provider     AiProvider
  encryptedKey String     @db.Text     // AES-256-GCM, base64(iv | tag | ciphertext)
  keyPreview   String                  // e.g. "sk-ant-...A3f9" — last 4 chars only
  createdAt    DateTime   @default(now())
  lastUsedAt   DateTime?

  @@unique([userId, provider])
  @@index([userId])
}

enum AdNetwork {
  TABOOLA
  OUTBRAIN
  MGID
  TIKTOK
  REVCONTENT
  ADSKEEPER
}

model Project {
  id                 String   @id @default(cuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id])
  name               String
  offerDescription   String
  targetAudience     String
  adNetwork          AdNetwork
  landingPageUrl     String?
  createdAt          DateTime @default(now())
  generationRequests GenerationRequest[]

  @@index([userId])
}

enum GenerationStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum ImageMode {
  POLLINATIONS    // free default
  BYOK_DALLE      // user's OpenAI key
  SVG_FALLBACK    // used when Pollinations times out
}

model GenerationRequest {
  id                String           @id @default(cuid())
  projectId         String
  project           Project          @relation(fields: [projectId], references: [id])
  status            GenerationStatus @default(PENDING)
  variantsRequested Int
  textProviderUsed  AiProvider       // which provider actually ran
  textWasBYOK       Boolean          // false = system Gemini, true = user key
  imageModeUsed     ImageMode
  startedAt         DateTime?
  completedAt       DateTime?
  errorMessage      String?
  createdAt         DateTime         @default(now())
  creatives         Creative[]

  @@index([projectId])
}

model Creative {
  id                  String   @id @default(cuid())
  generationRequestId String
  generationRequest   GenerationRequest @relation(fields: [generationRequestId], references: [id])
  headline            String
  description         String
  cta                 String
  imageS3Key          String?
  imagePromptUsed     String?
  createdAt           DateTime @default(now())

  @@index([generationRequestId])
}
```

## API surface (GraphQL)

```graphql
type Query {
  me: User
  projects: [Project!]!
  project(id: ID!): Project
  generationRequest(id: ID!): GenerationRequest
  myApiKeys: [UserApiKeyPreview!]!     # never returns encryptedKey or full value
}

type Mutation {
  createProject(input: CreateProjectInput!): Project!
  updateProject(id: ID!, input: UpdateProjectInput!): Project!
  deleteProject(id: ID!): Boolean!

  generateCreatives(
    projectId: ID!,
    variants: Int!,
    textProvider: AiProvider,          # if null + no key: system Gemini
    useByokImage: Boolean              # if true, requires OpenAI key
  ): GenerationRequest!

  deleteCreative(id: ID!): Boolean!
  regenerateCreative(id: ID!): Creative!

  saveApiKey(provider: AiProvider!, key: String!): UserApiKeyPreview!
  deleteApiKey(provider: AiProvider!): Boolean!
}

type UserApiKeyPreview {
  provider: AiProvider!
  keyPreview: String!                  # e.g. "sk-ant-...A3f9"
  createdAt: DateTime!
  lastUsedAt: DateTime
}
```

REST (non-GraphQL):
- `GET /health` — health check (Render keep-alive target)
- `GET /sse/generation/:id` — SSE stream of `{status, progress, creativesGenerated}` events, Clerk-protected

## Security model (BYOK)

The credentials service is a real production concern, treated as such.

**Storage:**
- Encryption: AES-256-GCM (symmetric, authenticated).
- Master key: 32-byte random value, stored in `ENCRYPTION_KEY` env var on Render. Never committed.
- Per-key IV: 12 bytes, randomly generated per encryption operation.
- Format stored in DB: `base64(iv || authTag || ciphertext)`.
- One row per `(userId, provider)`. Re-saving overwrites.

**Reading:**
- Decryption only inside `CredentialsService.getDecryptedKey(userId, provider)`.
- This method is callable **only by the BullMQ worker** during generation. Never by a GraphQL resolver. Never by any REST endpoint.
- The decrypted value lives in memory for one provider call, then goes out of scope.

**Visibility:**
- GraphQL never returns `encryptedKey`. Only `keyPreview` (`provider-prefix...last4chars`).
- API responses, error messages, and stack traces never include the decrypted value.
- Logger is configured with a redaction list including `apiKey`, `key`, `authorization`, `bearer`. Test verifies this in CI.

**Validation:**
- On `saveApiKey`, a single cheap ping is made to the provider to confirm the key works (e.g. Anthropic: list models; OpenAI: list models). If the ping fails, the key is not saved and the user gets a clear error.
- Ping happens on the API process, decrypted value is discarded immediately.

**Anti-abuse:**
- IP-based rate limit on demo mode (system Gemini key): 3 generations per IP per 24h, enforced before the BullMQ enqueue.
- Per-user rate limit overall: 10 generations per user per hour.
- Per-user image cap: 20 images per user per 24h regardless of provider.
- Hard cap on `variantsRequested`: 10.

**Disclosure on landing page and README:**
> Your API keys are encrypted at rest with AES-256-GCM. They are never logged, never displayed back to you, and never used outside your own generation requests. This source code is open — verify yourself.

## Out of scope (will NOT be built in v1)

- Multi-tenant / team workspaces
- Payments / Stripe / billing
- Email notifications
- Advanced prompt-engineering UI
- Mobile app or PWA
- Analytics / metrics dashboard
- Public API for third-party consumers
- Image editing
- A/B test winner tracking
- Webhooks for external systems
- Admin panel
- Asymmetric encryption / KMS / HSM (overkill for this class)
- Key rotation flow (manual delete + re-add is sufficient for v1)

Scope creep is the primary failure mode. If a feature is not in this document, it does not exist for v1. Adding a feature requires editing this section first.

## Weekly plan

Realistic budget: 10–15 hrs/week × 6 weeks ≈ 60–90 hrs total with Claude Code.

Each week ships to production. Nothing waits for the next week to be "done."

---

### Week 1 — Foundation

**Deliverable:** Empty-but-deployed shell with auth. Signing up at the live URL creates a `User` row in production Postgres.

- pnpm monorepo with `apps/web` and `apps/api`
- NestJS scaffold + Prisma + Supabase Postgres connection (pooled connection string with `?pgbouncer=true&connection_limit=1`)
- Next.js 15 scaffold (App Router) + Tailwind + shadcn/ui
- Docker Compose: local Postgres + Redis for development
- Clerk integrated on both apps
- `User` model + Clerk webhook to upsert on sign-up
- `GET /health` on NestJS
- Vercel project for `apps/web`; Render web service for `apps/api`
- Upstash Redis instance provisioned (used in week 3, set up now to avoid context-switching later)
- UptimeRobot configured to ping `/health` every 5 minutes
- README skeleton
- `.env.example` documented

**Acceptance:** Live URL works; new sign-up creates a row in prod Supabase Postgres confirmed via Supabase dashboard.

**Gaps closed:** Next.js setup, Docker, Postgres in production, cloud deploy.

---

### Week 2 — GraphQL layer + Projects CRUD

**Deliverable:** End-to-end Projects CRUD via GraphQL, functional but minimal UI.

- Apollo Server v4 via `@nestjs/apollo` with `ApolloDriver`
- Schema-first; `.graphql` files committed
- Apollo Client in Next.js with Clerk JWT via `setContext` link (refresh per request)
- `Project` model in Prisma + migration on Supabase
- Resolvers: `me`, `projects`, `project`, `createProject`, `updateProject`, `deleteProject`
- UI: `/dashboard` (list), `/projects/new` (form), `/projects/[id]` (detail stub)
- GraphQL Codegen for typed React hooks
- GraphQL Playground enabled in dev, disabled in production

**Acceptance:** Create / list / delete a project from production UI.

**Gaps closed:** GraphQL on both client and server.

---

### Week 3 — AI text generation + BullMQ + provider abstraction

**Deliverable:** User clicks "Generate" on a project; BullMQ enqueues a job; worker calls Gemini (system key, demo mode); creatives appear. Text only — no images yet.

- Upstash Redis wired into BullMQ
- Worker module — separate process via `nest start --entryFile worker`
- `AITextProvider` interface in `generation/providers/text/`:
  ```ts
  interface AITextProvider {
    generate(prompt: string, n: number): Promise<CreativeText[]>;
  }
  ```
- Implementations: `GeminiProvider` (uses `GEMINI_SYSTEM_KEY` env var by default; can also accept a passed user key), `AnthropicProvider`, `OpenAIProvider` — last two only used when BYOK key present (week 5)
- Provider factory: given `(userId, requestedProvider)`, returns the right provider with the right key
- Network-specific prompt templates in `generation/prompts/` — one file per network exporting `(offer, audience, networkContext) => string`. **Real domain knowledge goes here:** Taboola = curiosity headlines, Outbrain = informational, MGID = clickbait-tolerant, TikTok = punchy and short, RevContent = curiosity, Adskeeper = direct-response.
- Gemini JSON mode (`responseMimeType: 'application/json'` + schema) for clean parsing. No markdown-fence handling — lesson from the n8n incident.
- `generateCreatives` mutation: enqueues job, returns `GenerationRequest` in `PENDING`
- IP-based rate limiter for demo-mode requests (3/IP/24h) — `IpThrottlerGuard`
- Per-user rate limiter (10/hour) via NestJS throttler
- UI: "Generate N variants" button, list of past `GenerationRequest`s with status badges, polling fallback (SSE comes in week 5)

**Acceptance:** Production demo end-to-end: sign up, create project, generate 5 variants, refresh page, see 5 text creatives. End-to-end < 30s. Rate limit triggers after 3 IP requests in 24h.

**Gaps closed:** Event-driven / queues, AI in public production, provider-agnostic architecture, rate limiting.

---

### Week 4 — Image generation + storage

**Deliverable:** Each creative includes an image, generated via Pollinations by default, stored in Supabase Storage, rendered in the UI. SVG fallback wired up.

- `@aws-sdk/client-s3` pointed at Supabase S3-compatible endpoint (`https://<project>.supabase.co/storage/v1/s3`)
- Supabase Storage bucket setup with public-read for generated images
- `ImageProvider` interface:
  ```ts
  interface ImageProvider {
    generate(prompt: string): Promise<Buffer>;
  }
  ```
- Implementations:
  - `PollinationsProvider` — HTTP GET to `https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true`, 10s timeout
  - `SvgFallbackProvider` — `@vercel/og` or `satori` to render headline + CTA on a network-branded gradient background, returns PNG
  - `DalleProvider` — used only when BYOK OpenAI key present (week 5)
- Provider strategy in worker:
  1. If `useByokImage = true` and user has OpenAI key → DALL-E
  2. Else → try Pollinations with 10s timeout
  3. On Pollinations timeout/error → SVG fallback
  4. Record actual `imageModeUsed` on `GenerationRequest`
- Image prompt derived from headline; for SVG, the headline is the visual content
- Worker uploads result to Supabase Storage; resolver returns public URL (or signed URL if private)
- UI: creative cards with image, headline, description, CTA. Badge on the card showing image source ("AI image" / "Premium AI" / "Preview").

**Acceptance:** Production: 5 variants come back with images visible within 60s. Supabase Storage bucket shows uploaded objects. Force Pollinations error in dev and confirm SVG fallback works without manual intervention.

**Gaps closed:** Cloud storage SDK in production, multi-provider fallback strategy.

---

### Week 5 — Real-time progress + BYOK credentials

**Deliverable:** Live progress via SSE. BYOK API keys feature: users can save Anthropic / OpenAI / Gemini keys, and use them for premium generation.

- SSE endpoint `GET /sse/generation/:id` on NestJS, Clerk-protected
- Worker publishes progress to Redis pub/sub channel `generation:${id}`; SSE controller subscribes and streams
- Next.js client uses `EventSource` with cleanup on unmount
- Error handling on UI: failed generations show error message + retry button
- `CredentialsService` with all security guarantees from *Security model* section
- `UserApiKey` model migrated
- Resolvers: `myApiKeys`, `saveApiKey`, `deleteApiKey`
- Key validation ping on save (Anthropic: list models; OpenAI: list models; Gemini: list models)
- Logger redaction list configured + test asserting keys never appear in error logs
- UI: `/settings/api-keys` page — add key per provider, see preview, delete; clear "your key is encrypted, never displayed back" notice
- UI: project page — provider selector dropdown ("System (Gemini, free)" + any keys the user has saved), image toggle ("Free preview / Premium with your OpenAI key")
- CSV export of creatives in a project
- `regenerateCreative` mutation — replaces a single creative

**Acceptance:** During generation, progress bar advances without page refresh (Network tab shows SSE). User saves an Anthropic key, runs a generation, sees `textWasBYOK=true` and `textProviderUsed=ANTHROPIC` recorded. Server logs never contain raw key value.

**Gaps closed:** Real-time / SSE, secrets management at production grade.

---

### Week 6 — Tests, hardening, demo polish

**Deliverable:** Public, polished demo ready for CV and cover letters.

- Jest unit tests:
  - `CredentialsService` round-trip (encrypt → decrypt yields original)
  - Logger redaction (no key value appears in formatted output)
  - Prompt builders for each network (snapshot)
  - At least one resolver with mocked Prisma
- Playwright E2E: full happy path on demo mode (sign up → create project → generate → see creatives with images)
- GitHub Actions: lint + typecheck + Jest + Playwright on every PR; required to merge
- Production logging: Pino with error capture, redaction enabled, no PII
- Landing page at `/`: hero, 3-feature list (network-specific creatives / free demo / BYOK premium), "Try it free" CTA → Clerk signup, security disclosure section
- README: architecture diagram, screenshots / GIF, deploy instructions, env var list, security model summary
- Add demo URL + GitHub link to CV, LinkedIn, Resume Tailor

**Acceptance:** A stranger from a job application can open the demo URL, sign up, and generate working creatives with images unsupervised. CI green on main. Security disclosure visible on landing.

**Gaps closed:** Testing visibility, CI, production-ready packaging.

---

## Cost discipline

The whole point of this stack is $0 cost. Discipline rules:

- **No paid tier signups during the project.** Anything that requires a card gets replaced or cut.
- **Hard caps in code, not in policy.** Daily image cap, hourly generation cap, IP demo cap, variants-per-request cap — all enforced at the mutation/guard level, not via dashboard settings.
- **Demo-mode resource budget:** worst-case daily Gemini usage at full IP-cap saturation is well under 1500 req/day. Pollinations has no per-key limit. Supabase Storage 1GB holds ~10k generated images at typical PNG sizes.
- **Failure of a free dependency = SVG fallback or clear error.** No silent retry storms that burn quotas.
- **No analytics, no telemetry, no third-party tracking.** Not for privacy reasons primarily — these add free tiers that turn paid over time.

## Decisions log

| Decision | Rationale | Trade-off |
|---|---|---|
| pnpm monorepo | Single context for Claude Code; one PR per feature crosses both apps | Slightly heavier Vercel + Render setup |
| GraphQL over REST | Explicit gap closure | More boilerplate; mitigated by Apollo Codegen |
| SSE over WebSocket | Generation is one-way (server→client); half the complexity | Cannot send client→server over the same stream; not needed |
| Clerk over Auth.js | Auth not a learning target | Slight lock-in, acceptable for portfolio |
| Render over Railway | Card-free | Service sleeps after 15min idle; mitigated by UptimeRobot |
| Supabase Postgres over Neon | Also gives free Storage + S3-compatible endpoint in one provider | Slightly smaller free DB |
| Supabase Storage via AWS SDK | CV line "AWS S3 SDK integration" stays honest because the SDK literally is AWS's | Slightly more setup than `@supabase/storage-js` |
| Upstash Redis over self-hosted | Card-free, BullMQ compatible | Per-command quota; mitigated by hard rate limits |
| Gemini 2.0 Flash as demo default | Free 1500/day tier covers realistic portfolio traffic | Lower quality ceiling than Claude Sonnet |
| BYOK for Anthropic / OpenAI / Gemini | Users who want better quality pay their own way; zero cost to author | UX cost: settings page + onboarding for BYOK; mitigated by working demo mode |
| Pollinations.ai for default images | Free, no key, real AI images in demo | Reliability risk; mitigated by SVG fallback |
| SVG fallback via @vercel/og | Reliable last resort; brand-aware visual | Not real AI image; UI badges this clearly |
| AES-256-GCM symmetric encryption | Industry standard for this class of secret storage | Master key compromise = all keys compromised; acceptable for portfolio-scale risk |
| Schema-first GraphQL | Generated types shared cleanly across apps | Slightly more verbose than code-first |
| Apollo Server v4, not v3 | v4 is supported with `@nestjs/apollo` 12+ | Many old tutorials show v3; ignore them |
| Next.js 16 (not 15), Tailwind v4 (not v3), React 19 | `create-next-app@latest` defaults at week 1 scaffold time (2026-05-31). Next 16 = same App Router/RSC paradigm as 15; Tailwind 4 officially supported by shadcn/ui since 2025; React 19 paired with Next 16. | Fewer tutorials cover v16/v4 yet; mitigated by official docs being current. |
| Prisma v6 (not v7) | Prisma 7 removed `url` from datasource schema, requires driver-adapter pattern in PrismaClient constructor — significant complexity for portfolio scope. v6 keeps the classic `datasource db { url = env(...) }` pattern that matches the data model sketches in this spec. | Will need a migration story if v7 becomes mandatory. |

## Gotchas / lessons baked in

- **NestJS + Apollo v4:** use `@nestjs/apollo` + `ApolloDriver`. Don't follow v3 tutorials.
- **Supabase Postgres + Prisma:** use the pooled connection string with `?pgbouncer=true&connection_limit=1` to avoid the pool exhaustion class of bug that hit TrackBoost.
- **Supabase Storage S3 endpoint:** use service-role key for server-side writes; bucket policy must allow public read for the generated-images bucket, or use signed URLs.
- **BullMQ + Upstash:** use the standard Redis connection (not REST API). Set `maxRetriesPerRequest: null` on the connection — required by BullMQ.
- **Pollinations.ai:** unofficial service, no SLA. Always use a timeout (10s recommended) and fall back to SVG. URL-encode the prompt properly — special chars break it.
- **Render free tier sleep:** service sleeps after 15min of inactivity; first request after sleep takes 30-60s. UptimeRobot ping `/health` every 5 minutes keeps it warm.
- **Vercel serverless functions** have a 10s timeout on Hobby. All long-running work is on Render (NestJS), never on Vercel API routes.
- **Supabase Storage CORS:** must add the Vercel domain explicitly via Supabase dashboard, or images won't load in browser.
- **Clerk + Apollo:** auth token must be re-fetched per request; use `setContext` link, not a static `Authorization` header.
- **Gemini JSON mode:** use `responseMimeType: 'application/json'` plus an explicit `responseSchema` for clean parsing. Don't try to parse markdown-fenced JSON.
- **Encryption key in env var:** never commit. Generate locally with `openssl rand -base64 32`. Set in Render dashboard before first BYOK use.
- **Logger redaction:** Pino's `redact` option is allowlist-style on paths. Test it with a sample object including a key. Don't trust it works without verifying.
- **Prisma in workers:** instantiate `PrismaService` per worker process, not shared with API process, to avoid connection pool contention.

## Conventions

- **TypeScript strict everywhere.** No `any` in committed code; if forced, use `unknown` + narrow.
- **Branch naming:** `week-N/short-description` (e.g. `week-3/bullmq-setup`).
- **Commit style:** conventional commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- **One feature = one PR**, even if small. PR description references week and acceptance criteria.
- **No commented-out code in main.** Delete or move to a scratch file.
- **No `console.log` in committed code.** Use the logger.
- **No raw API keys in error messages or stack traces.** Ever.

## How to use this doc with Claude Code

1. Place this file at repo root as `PROJECT_SPEC.md`.
2. In root `CLAUDE.md`, include:
   > See `PROJECT_SPEC.md` for scope, stack, milestones, and decisions. Do not propose features outside the *Out of scope* section. Do not change locked stack choices without explicitly surfacing the conflict and proposing a Decisions-log entry. Do not suggest paid services — the *Cost discipline* section is binding.
3. At each week boundary, open a fresh Claude Code session and paste the relevant week section as the starting brief, plus the previous week's "Done" summary.
4. After each shipped week, append a `## Week N — Done` section at the bottom of this file with: what shipped, what got cut, any new gotchas learned. This is the scope-discipline log and valuable interview material later.

---

*Last updated: week 1 shipped — 2026-06-01.*

## Week 1 — Done (2026-06-01)

**Acceptance criterion met:** live URL works, new sign-up creates a row in prod Supabase via Clerk webhook.

**Shipped:**
- pnpm 11 monorepo (apps/web, apps/api, packages/)
- `apps/web`: Next.js 16 + Tailwind 4 + Clerk v7 on Vercel → https://ad-creative-generator-web.vercel.app
- `apps/api`: NestJS 11 + Prisma 6 on Render → https://ad-creative-generator-kqpw.onrender.com
- `/health` endpoint + UptimeRobot ping (5 min)
- Prisma schema with `User { id, clerkId, email, name, createdAt, updatedAt }` synced to Supabase
- Clerk webhook (Svix-verified) at `/webhooks/clerk` → upsert/delete User
- Postgres on Supabase (free tier), Redis on Upstash (provisioned, idle until week 3)

**Decisions log entries added:**
- Next.js 16 / Tailwind 4 / React 19 (not spec's "Next 15").
- Prisma 6 (not 7) — v7 removed `url` from datasource schema.
- Clerk v7 (`<Show when="signed-in/out">` replaces `<SignedIn>`/`<SignedOut>`).

**Cut from week 1:** nothing — on plan.

**New gotchas to remember:**
- **Supabase direct conn (`db.<ref>.supabase.co:5432`) is IPv6-only** — most home ISPs and Render free-tier don't route IPv6 → `P1001`. Use Supavisor Session pooler (5432) for migrations, Transaction pooler (6543) for runtime.
- **Transaction pooler (6543) breaks Prisma migration locks.** `migrate deploy` / `db push` hangs on advisory lock through PgBouncer transaction mode. Migrations must go via Session pooler — set `directUrl = env("DIRECT_URL")` in `schema.prisma`.
- **`nest build` outputs to `dist/src/` (not `dist/`) when any `.ts` file lives outside `src/`** (e.g. `prisma.config.ts` at api root). Fix: `tsconfig.build.json` needs `"include": ["src/**/*"]` AND exclude the stray file, otherwise `node dist/main` breaks on Render.
- **`WEB_APP_URL` CORS origin must have no trailing slash** — NestJS does exact match; browser sends `Origin` without slash.

## Week 2 — Done (2026-06-01)

**Acceptance criterion met:** create / list / delete project from production UI, end-to-end through GraphQL with Clerk auth.

**Shipped:**
- Prisma: `AdNetwork` enum + `Project` model (userId-scoped, cascade), `db push` to Supabase
- API: NestJS + Apollo Server v4 via `@nestjs/apollo` (ApolloDriver, schema-first, `typePaths` glob on `dist/**/*.graphql`)
- `ClerkAuthService` (verifies JWT via `@clerk/backend.verifyToken` with `secretKey`, resolves Prisma user), `GqlAuthGuard`, `@CurrentUser()` decorator
- Resolvers: `me`, `projects`, `project`, `createProject`, `updateProject`, `deleteProject` — all userId-scoped via `findFirst { id, userId }` / `deleteMany` ownership guard
- `DateTime` custom scalar (Date ↔ ISO string)
- Apollo landing page (embed) in dev only; `cors: false` in GraphqlModule (Nest's `enableCors` handles it)
- Web: Apollo Client v4 + `SetContextLink` injecting Clerk `graphql` JWT template per request
- GraphQL Codegen client-preset → typed documents in `src/lib/gql/`
- UI: `(dashboard)` route group with header, `/dashboard` (list + delete), `/projects/new` (form), `/projects/[id]` (detail stub)

**Decisions log entries added:**
- **Apollo Client v4** (not the v3 docs that flood Google). Breaking API changes: `ApolloProvider` moved to `@apollo/client/react`; `setContext` function replaced with `SetContextLink` class in `@apollo/client/link/context`.
- **No shadcn/ui yet** — Tailwind v4 utilities only. Add shadcn in week 3+ if creative-preview UI needs richer primitives.
- **Operations pattern:** call `graphql(\`…\`)` in `src/lib/graphql/operations.ts` so codegen scans them, but import the typed `*Document` consts from `@/lib/gql/graphql` directly. Going through the `graphql()` overload return type loses generics in `useQuery`.

**Cut from week 2:** updateProject UI (resolver exists; no form yet — defer to week 3 when editing creatives matters).

**New gotchas to remember:**
- **`@nestjs/apollo` v13 + Express needs `@as-integrations/express5`** as a peer dep. Without it, GraphqlModule fails to boot with "package is missing".
- **Apollo Client v4 `useQuery` typing requires `@graphql-typed-document-node/core`** as an explicit dep on the web app — pnpm doesn't auto-install it as a peer, and without it `data` resolves to `unknown` / `{}`.
- **Codegen's `graphql()` overload-match is fragile** — relies on exact string-literal match of the source. Re-exporting `*Document` from generated `graphql.ts` is more reliable than relying on the overload return type for hook generics.
- **Clerk v7 `UserButton` dropped `afterSignOutUrl` prop.** Sign-out redirect is configured at provider/app level now.
- **`nest build` assets:** `.graphql` files don't get copied to `dist/` unless `nest-cli.json` has `"assets": [{ "include": "**/*.graphql", "outDir": "dist" }]` + `"watchAssets": true`. Without this, schema-first runtime can't find the SDL.
- **Clerk JWT template name is load-bearing.** `getToken({ template: 'graphql' })` returns `null` if no template named `graphql` exists in Clerk dashboard — request goes out without Authorization header and resolver throws Unauthenticated.
