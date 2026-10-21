# Handoff: where to continue

Last updated: 2026-10-21. Read `CLAUDE.md` (or `AGENTS.md`) and `playbook.md` first, then start with the `majlis-workflow` skill.

## State

Phases 0 to 5 and 7 are done (phase 7 on branch `feat/admin-panel` until it is merged). Phase 7 checks on 2026-10-21: lint, typecheck, 183 unit tests, build (guest routes 121 to 126 KB), `node scripts/skills.mjs check`, migrations and seed on a fresh database, and 19 of 20 Playwright e2e tests. The one failure, `media.spec.ts` (voice message), fails the same on `main`; see Gotchas.

| Phase | State |
| --- | --- |
| 0 Collaboration scaffolding | done |
| 1 Setup (schema, auth, i18n, layout) | done |
| 2 Guestbook MVP | done |
| 3 Media+ (video, voice, live gallery, slideshow) | done |
| 4 Moderation and export, co-hosts, delete event | done |
| 5 E-card and RSVP | done |
| 6 Payments and plans | deferred by the developer (no gateway yet) |
| 7 Admin panel | done |
| 8 Hardening | **next** |

## Run it locally

```bash
npm install
cp .env.example .env     # set AUTH_SECRET (npx auth secret) and HASH_SALT (any long random string)
npm run db:start         # own terminal; embedded PostgreSQL on the DATABASE_URL port (5433 by default)
npx prisma migrate dev && npx prisma db seed
npm run dev              # http://localhost:3000, demo guest page /demo-aisyah-daniel
npm run build && npm run test:e2e
```

Sign in: any email on `/signin`; the magic link is printed in the server log and written to `.data/dev-mail.log`. `admin@majlisku.test` is an admin (`ADMIN_EMAILS`, checked on every request) and uses `/admin`. `demo.host@majlisku.test` owns the Premium demo event.

## What to build next

1. **Phase 8: Hardening.** Retention purge job (`Event.purgeAt` is already set; media must be deleted from storage too, and the job must delete the event's `AbuseReport` rows when it archives an event, per `docs/specs/phase-7-admin.md` §6), shared rate limiter (the current one is in memory), privacy policy and terms pages (`privacy`, `terms` slugs are reserved), Dockerfile and deployment guide, S3/R2 `StorageDriver`.
2. **Phase 6: Payments**, only when the developer asks. Use a `PaymentProvider` interface; read `.claude/skills/payments-guard`.

## Gotchas (learned the hard way)

- **Editor injection bug:** in this VS Code setup, files written or edited under `[bracket]` folders (`src/app/[locale]/...`, `src/app/api/e/[slug]/...`) can get `git log` text pasted into them. After writing such files, grep for `^commit [0-9a-f]{40}` in `src` and `tests` and delete the junk. Writing to a folder outside the repo and copying in does not always avoid it.
- Do not run `next dev` and `next build` at the same time (shared `.next/`). Stop old `next start` processes before `npm run test:e2e`, or Playwright reuses a stale server.
- An installed PostgreSQL on port 5432 is fine; the embedded one uses 5433. If 5433 is taken (on the 2026-10-21 machine it was another project's Docker container), set another port in `DATABASE_URL` in `.env`, for example 5434.
- Your npm version decides the lockfile shape: npm 10 drops the `libc` fields that npm 11 writes into `package-lock.json`. Do not commit that churn; `git checkout package-lock.json` after `npm install`.
- `tests/e2e/media.spec.ts` (voice message) fails on a fresh Playwright Chromium download (`chromium_headless_shell-1248`): "Merakam…" never appears after "Mula rakam". It fails the same on `main` at 33b2ab1, so it is the fake microphone in that browser build, not app code. Still open.
- Admins are read-only on host dashboards (they can view, not change or export); every admin change goes through `/admin` and is in the audit log.
- npm 11 blocks install scripts: new packages with install scripts need `npm approve-scripts <pkg>` (stored in `allowScripts` in `package.json`).
- Read `NEXT_PUBLIC_APP_URL` through `env()` in server code, never `process.env.NEXT_PUBLIC_*` (frozen at build time).
- Bash heredocs on this machine can eat backslashes; write code containing them with a file tool.

## Process reminders

Specs and plans per phase are in `docs/specs/` and `docs/plans/`. Tests first. Both languages for every string (`messages/ms.json`, `messages/en.json`; a unit test checks the keys match). Guest pages stay under 150 KB first-load JS (currently about 126 KB). Role agents live in `.claude/agents/`; edit the Claude copy and run `node scripts/skills.mjs sync`. Do not commit or push without the developer's say-so.
