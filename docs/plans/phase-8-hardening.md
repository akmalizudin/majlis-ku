# Phase 8a TDD Plan: Local hardening

Spec: `docs/specs/phase-8-hardening.md` (approved 2026-10-21). Branch: `feat/infra-hardening`, worktree `.worktrees/feat/infra-hardening`.

Slices run one after the other in this worktree. Each slice is one implementer dispatch followed by one reviewer pass. The orchestrator runs the final evidence.

Unit tests stay pure (no database), as in the rest of `tests/unit/`. Modules that import `@/server/db` start with `import "server-only"` and cannot be loaded by Vitest, so every decision lives in a file without that import and is tested there: `rateLimitResult`, `nextPurgeAt`, the role rules, `secretMatches`, and the purge orchestration (`runPurge`, which takes its database and storage operations as parameters). The thin Prisma wiring is covered by the e2e suite in slice 8.

## Global constraints

- Server owns the truth: retention comes from `Plan.retentionDays`; nothing a client sends affects the purge or a limit.
- Zod at every boundary: `CRON_SECRET` through `src/lib/env.ts`; the cron route takes no body.
- Both locales: every new string in `messages/ms.json` and `messages/en.json` (`tests/unit/messages.test.ts` enforces it).
- Guest routes stay under 150 KB first-load JS: the footer and legal pages add no `"use client"` code.
- Privacy: no raw IP, device token or guest content in `RateLimit`, logs or audit metadata.
- Editor quirk (`docs/HANDOFF.md`): after writing any file under a `[bracket]` folder, run `grep -rnE '^commit [0-9a-f]{40}' src tests` and remove any pasted git log text.
- npm 10 rewrites `package-lock.json`: no dependency is added in this phase; if it changes, `git checkout package-lock.json`.
- Must not change: existing migrations, the guest upload flow (`src/components/guest/` except the consent link in `guest-actions.tsx`, `src/server/uploads/`), `src/server/plans/limits.ts`, `deleteEventCompletely`, the limits' numbers and key material, specs and plans of earlier phases.

## Slice 1: schema and migration

- Files: `prisma/schema.prisma`; new `prisma/migrations/<ts>_hardening/migration.sql` (generated).
- Change, exactly as spec §3: `Event.archivedAt DateTime?` with `@@index([archivedAt])`; `AuditAction.EVENT_PURGED`; model `RateLimit { key String @id, windowStart DateTime, count Int, @@index([windowStart]) }`.
- Red: none possible in unit tests (no database); the check is the migration itself.
- Green: `npx prisma migrate dev --name hardening`.
- Validate: `npx prisma validate`; the migration applies on the local database (port from `.env`); `npm run typecheck`; `npm test` (183 green).
- Review checkpoint: no required column without a default; the SQL only adds.

## Slice 2: archived events are read-only, and edits keep retention

- Files: `src/server/moderation/rules.ts`, `src/server/events/retention.ts`, `src/server/events/service.ts` (`updateEvent`), every `canEditEvent` / `canModerate` call site: `src/server/events/actions.ts`, `src/server/ecard/access.ts`, `src/server/ecard/actions.ts`, `src/server/moderation/actions.ts`, `src/app/api/events/[id]/cover/route.ts`, `src/app/api/events/[id]/export/media/route.ts`, `src/app/api/events/[id]/export/wishes/route.ts`, `src/app/api/events/[id]/rsvp/export/route.ts`, `src/app/[locale]/dashboard/events/[eventId]/card/page.tsx`, `.../edit/page.tsx`, `.../gallery/page.tsx`, `.../rsvp/page.tsx`; tests `tests/unit/moderation/rules.test.ts`, `tests/unit/events/retention.test.ts`.
- Interfaces:
  - `type EventAccess = { memberRole: MemberRole; status: EventStatus }`
  - `canEditEvent(event: EventAccess): boolean` and `canModerate(event: EventAccess): boolean`: owner or co-host, and status not `ARCHIVED`. `canManageMembers` and `canDeleteEvent` keep taking a role.
  - `nextPurgeAt(current: { startsAt: Date; purgeAt: Date | null }, nextStartsAt: Date, retentionDays: number, now?: Date): Date | null`: the stored `purgeAt` when the date is unchanged (same millisecond), else `computePurgeAt({ startsAt: nextStartsAt, retentionDays, now })`.
- Red, `tests/unit/moderation/rules.test.ts`:
  - "archived events are read-only for owners and co-hosts": `canEditEvent({ memberRole: "OWNER", status: "ARCHIVED" })` and `canModerate({ memberRole: "COHOST", status: "ARCHIVED" })` are `false`; `canEditEvent({ memberRole: "OWNER", status: "ACTIVE" })` and `({ memberRole: "COHOST", status: "SUSPENDED" })` are `true`; `"ADMIN"` stays `false` everywhere.
  - Existing role tests move to the object form.
  - Command: `npx vitest run tests/unit/moderation/rules.test.ts`. Expected red: `canEditEvent({ memberRole: "OWNER", status: "ACTIVE" })` is `false`, because today's function compares its argument with the string `"OWNER"`.
- Red, `tests/unit/events/retention.test.ts`:
  - "keeps purgeAt when the date does not change": a stored `purgeAt` comes back as is, even when `now` is later.
  - "recomputes purgeAt when the date changes": new date gives `max(newStartsAt, now) + retentionDays`.
  - Command: `npx vitest run tests/unit/events/retention.test.ts`. Expected red: `nextPurgeAt` is not exported.
- Green: the rules; every call site passes `event` (a `MemberEvent` already has `memberRole` and `status`); `updateEvent` uses `nextPurgeAt(event, input.startsAt, event.plan.retentionDays)`.
- Validate: `npm test`, `npm run typecheck`, `npm run lint`.
- Review checkpoint: grep shows no remaining `canEditEvent(event.memberRole)` or `canModerate(event.memberRole)`; the admin plan change still recomputes (`planChange` unchanged).

## Slice 3: rate limiter on Postgres

- Files: new `src/server/security/rate-limit-rules.ts`; `src/server/security/rate-limit.ts` (rewritten); call sites `src/app/api/e/[slug]/pin/route.ts`, `.../uploads/route.ts`, `.../wishes/route.ts`, `.../rsvp/route.ts`, `.../guest/route.ts`, `src/server/reports/actions.ts`; test `tests/unit/security/rate-limit.test.ts` (rewritten for the pure function).
- Interfaces:
  - `rateLimitResult(row: { count: number; windowStart: Date }, limit: number, windowMs: number, now: Date): { ok: boolean; retryAfterSec: number }`: `ok` when `count <= limit`; `retryAfterSec = max(1, ceil((windowStart + windowMs - now) / 1000))` when blocked, else 0.
  - `createRateLimiter({ name, limit, windowMs })` returns `{ hit(key: string): Promise<RateLimitResult>; reset(key: string): Promise<void> }`. `hit` runs one `db.$queryRaw` upsert on `"RateLimit"` with key `` `${name}:${key}` ``: insert `(key, now, 1)`, on conflict set `windowStart = CASE WHEN old.windowStart <= now - window THEN now ELSE old.windowStart END`, `count = CASE WHEN ... THEN 1 ELSE old.count + 1 END`, returning `count, "windowStart"`. `reset` is `deleteMany({ where: { key } })`.
  - `limiters` keeps the same six names and numbers.
- Red, `tests/unit/security/rate-limit.test.ts`:
  - "allows up to the limit": count 3 of limit 3 is ok with `retryAfterSec` 0.
  - "blocks over the limit with the seconds left in the window": count 4, window started 400 s into a 600 s window, gives `{ ok: false, retryAfterSec: 200 }`.
  - "never asks to wait less than a second": blocked at the window's last millisecond gives 1.
  - Command: `npx vitest run tests/unit/security/rate-limit.test.ts`. Expected red: module `rate-limit-rules` not found.
- Green: the pure function, the Postgres limiter, and `await` at the six call sites (the PIN route awaits `reset` too).
- Validate: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Manual check against the local database: three wrong PINs on the demo event leave a `RateLimit` row with count 3 (`npx prisma studio` or the Prisma MCP).
- Review checkpoint: the SQL uses parameters only (tagged `$queryRaw`, no `$queryRawUnsafe`); a database error rejects (no catch that lets the request through).

## Slice 4: the purge

- Files: new `src/server/retention/run-purge.ts` (pure orchestration, no `server-only`), new `src/server/retention/purge.ts` (`server-only`, Prisma, storage and bus wiring); test `tests/unit/retention/run-purge.test.ts`.
- Interfaces (`run-purge.ts`):
  - `type PurgeOps = { dueEventIds(now): Promise<string[]>; claim(id, now): Promise<boolean>; closeStreams(id): void; deleteFiles(id): Promise<void>; deleteGuestData(id, now): Promise<{ finalized: boolean; counts: PurgeCounts }>; recentlyArchivedIds(since): Promise<string[]>; sweepGuestData(id): Promise<void>; deleteOldRateLimits(before): Promise<void>; log(line: string): void }`
  - `runPurge(ops: PurgeOps, now: Date): Promise<{ archived: number; failed: number }>`: for each due id, `claim` (skip on false), `closeStreams`, `deleteFiles`, `deleteGuestData` (counts as archived when `finalized`); each event in its own try/catch logging `[purge] event <id> failed: <error.name>`; then re-sweep every id archived since `now - 24 h` (`deleteFiles` then `sweepGuestData`, failures logged the same way, not counted); then `deleteOldRateLimits(now - 24 h)`.
- Interfaces (`purge.ts`): `purgeExpiredEvents(now = new Date()): Promise<{ archived; failed }>` wiring `PurgeOps` with Prisma: `claim` is `updateMany({ where: { id, purgeAt: { lte: now }, archivedAt: null }, data: { status: "ARCHIVED" } })`; `deleteGuestData` is an interactive `db.$transaction(async (tx) => ...)` deleting `Upload`, `Wish`, `Rsvp`, `Guest`, `AbuseReport`, `ECard` rows, then `updateMany({ where: { id, archivedAt: null }, data: { archivedAt: now, coverKey: null, pinHash: null, uploadCount: 0, storageBytes: 0 } })`, and `writeAudit` with `EVENT_PURGED`, actor null and the counts only when that updated 1 row; `sweepGuestData` deletes the same six tables' rows and sets `coverKey = null`; `deleteFiles` is `storage().deletePrefix(eventPrefix(id))`; `closeStreams` is `bus.publish(id, { type: "closed" })`; `log` is `console.warn`. `writeAudit` (`src/server/admin/audit.ts`) is reused; if it needs an actor, it gains `actorId: string | null`.
- Red, `tests/unit/retention/run-purge.test.ts` (fake `PurgeOps` recording calls):
  - "archives a due event in order: claim, close streams, delete files, delete guest data": the call log is exactly that order; result `{ archived: 1, failed: 0 }`.
  - "skips an event whose claim fails": no files deleted, result `{ archived: 0, failed: 0 }`.
  - "does not count an event another run finalized": `deleteGuestData` returns `finalized: false` gives `archived: 0`.
  - "keeps going after one event fails and logs only the error name": the first event's `deleteFiles` throws `new TypeError("guest secret")`; the second is archived; result `{ archived: 1, failed: 1 }`; the log line is `[purge] event e1 failed: TypeError` and contains no message text.
  - "re-sweeps events archived in the last 24 hours": `recentlyArchivedIds` is called with `now - 24 h`, and `deleteFiles` and `sweepGuestData` run for each id it returns (the late-file case from the spec).
  - "deletes rate-limit rows older than a day".
  - Command: `npx vitest run tests/unit/retention/run-purge.test.ts`. Expected red: module `run-purge` not found.
- Green: `runPurge`, then `purgeExpiredEvents`.
- Validate: `npm test`, `npm run typecheck`, `npm run lint`.
- Review checkpoint: the claim and the finalize are both guarded by `archivedAt: null`; the audit row is inside the same transaction; the six tables match spec criterion 2.4; `Payment`, `EventMember` and `AuditLog` are never touched.

## Slice 5: triggers, health, headers

- Files: new `src/server/retention/schedule.ts` (shared in-flight promise and timer), `src/instrumentation-node.ts`, new `src/app/api/cron/purge/route.ts`, new `src/server/security/secret.ts`, `src/lib/env.ts` (`CRON_SECRET` min 16), new `src/app/api/health/route.ts`, `next.config.ts`; tests `tests/unit/security/secret.test.ts`, `tests/unit/env.test.ts`.
- Interfaces:
  - `secretMatches(given: string | null | undefined, expected: string): boolean`: SHA-256 both, then `timingSafeEqual`; false for missing input.
  - `runPurgeOnce(): Promise<{ archived; failed }>` (`schedule.ts`): returns the running promise if one exists, else starts `purgeExpiredEvents()` and clears it when done.
  - `startPurgeSchedule()`: skips when `process.env.NEXT_PHASE === "phase-production-build"` or `globalThis.__purgeSchedule` is set; `setTimeout(60 s)` then `setInterval(1 h)`, both `unref()`; each tick `runPurgeOnce().catch(...)` logs `[purge] run failed: <error.name>`.
  - `POST /api/cron/purge`: 404 when `env().CRON_SECRET` is unset; 401 unless `secretMatches(bearer, CRON_SECRET)`; else `Response.json(await runPurgeOnce())`. Uses the existing `handle()` wrapper for 500s.
  - `GET /api/health`: `Promise.race([db.$queryRaw\`SELECT 1\`, timeout(2000)])`; 200 `{ status: "ok" }` or 503 `{ status: "error" }`, `Cache-Control: no-store`, `dynamic = "force-dynamic"`.
  - `next.config.ts` `headers()`: `[{ source: "/:path*", headers: [...] }]` with the five headers of spec criterion 24.
- Red:
  - `tests/unit/security/secret.test.ts`, "matches only the exact secret": true for the same string; false for a different one, a prefix, an empty string, `null` and `undefined`, and no throw on different lengths. Command: `npx vitest run tests/unit/security/secret.test.ts`. Expected red: module not found.
  - `tests/unit/env.test.ts`, "rejects a CRON_SECRET shorter than 16 characters": `parseEnv({ ...valid, CRON_SECRET: "short" })` throws; 16 characters passes; unset passes. Expected red: "short" is accepted today.
- Green: as above.
- Validate: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` (the build must not start the timer: no `[purge]` line in the build output).
- Review checkpoint: the secret is never logged; the health route returns no error text.

## Slice 6: host and admin UI for archived events

- Files: `src/app/[locale]/dashboard/events/[eventId]/layout.tsx` (banner), `.../page.tsx` (hide the "kept until" line when archived), `src/app/[locale]/dashboard/page.tsx` (archived label in the list), the admin audit labels (`src/components/admin/labels.ts` or wherever `admin.audit.actions` is read), `messages/ms.json`, `messages/en.json`.
- Strings (both languages, spec criterion 10): `eventNav.archivedBanner` with `{date}`, `eventNav.archivingBanner`, `dashboard.archived` (list label; reuse an existing key if one exists), `admin.audit.actions.EVENT_PURGED` ("Dipadam automatik (tempoh simpanan tamat)" / "Purged (retention ended)").
- Red: `tests/unit/messages.test.ts` fails if a key is added in one language only (keeps both in step); the behaviour is covered by e2e in slice 8.
- Green: the banner shows `archivedBanner` with the date in `Asia/Kuala_Lumpur` (`formatEventDate`) when `archivedAt` is set, else `archivingBanner`, when `status === "ARCHIVED"`.
- Validate: `npm test`, `npm run typecheck`, `npm run lint`.

## Slice 7: privacy and terms pages, footer, consent link

- Files: new `src/lib/legal.ts`, new `src/components/site-footer.tsx`, new `src/app/[locale]/privacy/page.tsx`, new `src/app/[locale]/terms/page.tsx`; footer added to `src/app/[locale]/page.tsx`, `src/app/[locale]/signin/page.tsx`, `src/app/[locale]/[slug]/page.tsx`, `src/app/[locale]/[slug]/report/page.tsx`, `src/app/[locale]/i/[slug]/page.tsx`; consent link in `src/components/guest/guest-actions.tsx`; `messages/ms.json`, `messages/en.json`; test `tests/unit/legal.test.ts`.
- Interfaces:
  - `LEGAL = { controller: "[NAMA SYARIKAT]", email: "[EMEL]", address: "[ALAMAT]" } as const` (`src/lib/legal.ts`), with a comment that a legal review fills it before launch.
  - `SiteFooter` (server component): links to `/privacy` and `/terms` with `next-intl` `Link`, min 44 px tap targets.
  - The privacy page reads active plans (`db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })`) and lists `nameMs` or `nameEn` with `retentionDays`.
  - Copy under `legal.privacy.*`, `legal.terms.*`, `legal.footer.*`, plus `guest.consentPrivacyLink` (or the existing namespace of `consent`). Sections per spec criteria 20 and 21; placeholders come in as `{controller}`, `{email}`, `{address}` values, never typed into the messages.
  - The consent link is a plain `<a href>` built with the locale (no new client code); `guest-actions.tsx` already is a client component and this adds only markup.
- Red, `tests/unit/legal.test.ts`:
  - "keeps the legal placeholders in one place": every value in `LEGAL` is a non-empty string; neither `messages/ms.json` nor `messages/en.json` contains `[NAMA SYARIKAT]`, `[EMEL]` or `[ALAMAT]` (they must come from `LEGAL`).
  - "has a privacy and terms section for every topic in the spec": `legal.privacy` has the keys `controller`, `collected`, `purpose`, `access`, `retention`, `deletion`, `cookies`, `contact`; `legal.terms` has `service`, `hostDuties`, `prohibited`, `suspension`, `plans`, `warranty`, `law`, `contact`, in both files.
  - Command: `npx vitest run tests/unit/legal.test.ts`. Expected red: module `@/lib/legal` not found.
- Green: the module, the messages, the pages and the footer.
- Validate: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` (guest routes still under 150 KB; the privacy and terms routes add no client JS); the Playwright MCP at 360 px for both pages in both languages.
- Review checkpoint: guest-experience-guard (budget, in-app browsers, tap targets, contrast) and privacy-pdpa-guard (the policy matches what the code actually collects).

## Slice 8: e2e

- Files: new `tests/e2e/db.ts` (Prisma client for fixtures), new `tests/e2e/hardening.spec.ts`, `playwright.config.ts` (`CRON_SECRET` in `webServer.env`, exported for the test as a constant), `tests/e2e/helpers.ts` only if a shared step is needed.
- Tests (spec criterion 26):
  - "purge archives an expired event and deletes guest data": create an event (existing helper), a guest adds a photo, a wish and an RSVP (switch the event to a plan with the e-card through the admin UI or the fixture); keep a signed media URL; the fixture sets `purgeAt` to yesterday; `POST /api/cron/purge` with the secret (200); then the guest page is 404, the media URL is 404, the host dashboard shows the archived banner, the fixture finds 0 `Upload`, `Wish`, `Rsvp`, `Guest` rows and `archivedAt` set, and `/admin/audit` lists `EVENT_PURGED`.
  - "cron purge needs the secret": wrong bearer is 401.
  - "PIN attempts are counted in the database": event with a PIN; 2 wrong PINs, then the fixture finds `RateLimit` key `pinAttempt:<eventId>:%` with count 2; correct PIN, then the row is gone; 5 wrong PINs, then the right PIN is 429 `locked`.
  - "privacy and terms pages in both languages, linked from the guest page footer".
  - "security headers on pages and API responses": `/ms` and `/api/health` both carry the five headers.
  - "health route reports ok": 200 `{ status: "ok" }`.
- Red: the behaviour is already built by slices 2 to 7, so these tests are acceptance checks rather than red-first tests. To prove each one can fail, the implementer runs the purge test once with the cron call removed and the PIN test once with the `RateLimit` assertion pointed at a wrong key, sees both fail, and restores them.
- Validate: stop old `next start` processes, `npm run build`, `npm run test:e2e`. Expected: all new tests pass; the known `media.spec.ts:38` voice failure stays the only failure.

## Slice 9: docs

- Files: `CLAUDE.md`, `AGENTS.md` (status: 8a done, 8b next; purge, triggers, `RateLimit`, legal placeholders), `.env.example` (`CRON_SECRET` comment: 16 or more characters, enables `/api/cron/purge`), `docs/HANDOFF.md` (the 8b list including PIN guessing and IP trust; e2e count).
- Validate: `node scripts/skills.mjs check`; doc-drift.

## Coverage check against the spec

| Spec criteria | Slice |
| --- | --- |
| 1 to 7 (purge steps, re-sweep, idempotency, logging, rate-limit cleanup) | 4 (unit), 8 (e2e) |
| 8 (purgeAt only on date change) | 2 |
| 9 (archived read-only) | 2 |
| 10, 11 (banners, labels, audit) | 6, 8 |
| 12 to 14 (timer, in-flight, cron route) | 5, 8 |
| 15 to 18 (rate limiter) | 3, 8 |
| 19 to 23 (legal pages, footer, consent link) | 7, 8 |
| 24, 25 (headers, health) | 5, 8 |
| 26, 27 (tests) | 2 to 8 |
| 28 (docs) | 9 |
