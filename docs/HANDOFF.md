# Handoff: where to continue

Last updated: 2026-10-20. Read `CLAUDE.md` (or `AGENTS.md`) and `playbook.md` first, then start with the `majlis-workflow` skill.

## State

Phases 0 to 5 are done and merged to `main`. All checks were green at handoff: lint, typecheck, 137 unit tests, 12 Playwright e2e tests, `node scripts/skills.mjs check`.

| Phase | State |
| --- | --- |
| 0 Collaboration scaffolding | done |
| 1 Setup (schema, auth, i18n, layout) | done |
| 2 Guestbook MVP | done |
| 3 Media+ (video, voice, live gallery, slideshow) | done |
| 4 Moderation and export, co-hosts, delete event | done |
| 5 E-card and RSVP | done |
| 6 Payments and plans | deferred by the developer (no gateway yet) |
| 7 Admin panel | **next** |
| 8 Hardening | after 7 |

## Run it locally

```bash
npm install
cp .env.example .env     # set AUTH_SECRET (npx auth secret) and HASH_SALT (any long random string)
npm run db:start         # own terminal; embedded PostgreSQL on port 5433
npx prisma migrate dev && npx prisma db seed
npm run dev              # http://localhost:3000, demo guest page /demo-aisyah-daniel
npm run build && npm run test:e2e
```

Sign in: any email on `/signin`; the magic link is printed in the server log and written to `.data/dev-mail.log`. `admin@majlisku.test` is an admin (`ADMIN_EMAILS`). `demo.host@majlisku.test` owns the Premium demo event.

## What to build next

1. **Phase 7: Admin panel** (`/admin`, role `ADMIN`; the page exists but is empty). Users, events (change an event's plan by hand, since payments are deferred), template management, plan and price editing, storage usage, abuse reports (needs a new `AbuseReport` model and a "report" link on guest pages), audit log. Write `docs/specs/phase-7-admin.md` and a plan first.
2. **Phase 8: Hardening.** Retention purge job (`Event.purgeAt` is already set; media must be deleted from storage too), shared rate limiter (the current one is in memory), privacy policy and terms pages (`privacy`, `terms` slugs are reserved), Dockerfile and deployment guide, S3/R2 `StorageDriver`.
3. **Phase 6: Payments**, only when the developer asks. Use a `PaymentProvider` interface; read `.claude/skills/payments-guard`.

## Gotchas (learned the hard way)

- **Editor injection bug:** in this VS Code setup, files written or edited under `[bracket]` folders (`src/app/[locale]/...`, `src/app/api/e/[slug]/...`) can get `git log` text pasted into them. After writing such files, grep for `^commit [0-9a-f]{40}` in `src` and `tests` and delete the junk. Writing to a folder outside the repo and copying in does not always avoid it.
- Do not run `next dev` and `next build` at the same time (shared `.next/`). Stop old `next start` processes before `npm run test:e2e`, or Playwright reuses a stale server.
- An installed PostgreSQL on port 5432 is fine; the embedded one uses 5433.
- npm 11 blocks install scripts: new packages with install scripts need `npm approve-scripts <pkg>` (stored in `allowScripts` in `package.json`).
- Read `NEXT_PUBLIC_APP_URL` through `env()` in server code, never `process.env.NEXT_PUBLIC_*` (frozen at build time).
- Bash heredocs on this machine can eat backslashes; write code containing them with a file tool.

## Process reminders

Specs and plans per phase are in `docs/specs/` and `docs/plans/`. Tests first. Both languages for every string (`messages/ms.json`, `messages/en.json`; a unit test checks the keys match). Guest pages stay under 150 KB first-load JS (currently about 126 KB). Role agents live in `.claude/agents/`; edit the Claude copy and run `node scripts/skills.mjs sync`. Do not commit or push without the developer's say-so.
