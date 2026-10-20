# Phase 1 TDD Plan: Setup

Spec: `docs/specs/phase-1-setup.md` (approved 2026-10-20). Branch: `feat/infra-setup`.

Scope boundary: no guest upload, gallery, QR, e-card, or payment feature code. Must not change: `.claude/`, `.codex/`, `playbook.md` (except doc-drift fixes).

## Slice 1: toolchain

- Files: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `src/app/globals.css`.
- Red: `npm test` with `tests/unit/money.test.ts` failing because `src/lib/money.ts` does not exist.
- Green: `src/lib/money.ts` (`formatSen(4000) === "RM 40.00"`, `parseRinggit("40") === 4000`, rejects negatives and fractions of a sen).

## Slice 2: dates and env

- Red: `tests/unit/dates.test.ts` (`formatEventDate` shows a UTC instant in `Asia/Kuala_Lumpur`, both locales; `klDateToUtc` round-trips), `tests/unit/env.test.ts` (`parseEnv` names the missing variable; accepts a minimal valid set).
- Green: `src/lib/dates.ts`, `src/lib/env.ts`.

## Slice 3: database

- Files: `scripts/db.mjs` (embedded PostgreSQL: initialise once into `.data/postgres`, start, create the `majlis` database), `prisma/schema.prisma` (spec section 4), first migration, `prisma/seed-data.ts`, `prisma/seed.ts`, `src/server/db.ts`.
- Red: `tests/unit/seed-data.test.ts` expects three plans with the agreed limits (Free 100 items, 30 days, no video; E-card 4000 sen; Premium 12000 sen, 60 s video, 365 days) and three templates.
- Green: `prisma/seed-data.ts`; then `npx prisma migrate dev --name init` and `npx prisma db seed` twice (idempotent upserts).

## Slice 4: i18n and layout

- Files: `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts`, `src/middleware.ts`, `messages/ms.json`, `messages/en.json`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/components/locale-toggle.tsx`, `src/app/manifest.ts`, `public/icons/`.
- Red: `tests/unit/messages.test.ts` fails when `ms.json` and `en.json` do not have the same keys.
- Green: both message files with identical key sets.

## Slice 5: auth and roles

- Files: `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/server/auth/roles.ts`, sign-in pages, `/dashboard` and `/admin` placeholders, forbidden page.
- Red: `tests/unit/roles.test.ts` (`isAdminEmail` honours `ADMIN_EMAILS`, case-insensitive; `canAccessAdmin` only for `ADMIN`).
- Green: `src/server/auth/roles.ts`. Dev magic link printed to the server log when `EMAIL_SERVER` is empty.

## Slice 6: e2e smoke and docs

- `tests/e2e/smoke.spec.ts`: `/` in Malay and `/en` in English on a 360 px viewport; the toggle switches language; `/dashboard` signed out redirects to sign-in.
- Doc drift: `CLAUDE.md`, `AGENTS.md` commands and status, `.env.example`.

## Validation

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (guest route first-load JS < 150 KB), `npm run test:e2e`, `node scripts/skills.mjs check`.