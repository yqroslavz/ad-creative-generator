# Ad-Creative Generator

See `PROJECT_SPEC.md` for scope, stack, milestones, and decisions.

## Binding rules

- Do not propose features outside the *Out of scope* section of `PROJECT_SPEC.md`.
- Do not change locked stack choices (the "Stack — LOCKED" table) without explicitly surfacing the conflict and proposing a *Decisions log* entry.
- Do not suggest paid services — the *Cost discipline* section is binding ($0 mode, no credit cards required).
- Demo must work for unauthenticated visitors out of the box. Recruiters never provide API keys to see the product working.

## Workflow

- At each week boundary, start a fresh Claude Code session and paste the relevant week section as the starting brief, plus the previous week's "Done" summary.
- After each shipped week, append a `## Week N — Done` section at the bottom of `PROJECT_SPEC.md` with: what shipped, what got cut, any new gotchas learned.
- One feature = one PR. Branch naming: `week-N/short-description`. Conventional commits.
- TypeScript strict everywhere. No `any` in committed code.
- No `console.log`, no raw API keys in error messages or stack traces.

## Security non-negotiables (BYOK)

- BYOK keys: AES-256-GCM, master key in `ENCRYPTION_KEY` env var on Render, never committed.
- Decryption only inside `CredentialsService.getDecryptedKey()`, callable **only by the BullMQ worker**.
- GraphQL never returns `encryptedKey` — only `keyPreview`.
- Logger redaction list verified by CI test.
