---
name: data-contract-guard
description: Use when a Majlis Ku change touches prisma/schema.prisma, a migration, a route handler, a server action, a Zod schema, an env variable, or .mcp.json. Keeps the data model and API contracts typed, validated, tested, and safe for teammates working in parallel.
---

# Data Contract Guard

The schema and the API are shared by everyone working in parallel. Check every item before
design approval, before edits, and again at verification.

## Schema and migrations

- One migration per schema change, made with `npx prisma migrate dev --name <slug>` on the branch. Never edit a migration already on `main`.
- New required columns on existing tables need a default or a backfill step in the migration.
- Every relation states its `onDelete`. Deleting an `Event` must cascade to its uploads, wishes, RSVPs, guests, and card, so the host can delete everything (PDPA).
- Index the columns the gallery and dashboards filter and sort by (for example `eventId, createdAt`).
- Money columns are `Int` in sen. Byte counts are `BigInt`. Times are `DateTime` in UTC.
- Enums for closed sets (upload kind, moderation state, payment status); `Json` only for template content and provider payloads.

## Route handlers and server actions

- Parse input with a Zod schema from `src/lib/schemas/`; reject unknown fields.
- Authorize before doing anything: guest of this event, host or co-host of this event, or admin. Look the event up by the id or slug in the path and check membership; never trust an `eventId` from the body alone.
- Call the domain function in `src/server/<domain>/`; keep the handler thin.
- Errors use one shape (`{ error: { code, message } }`) with stable codes; messages shown to users come from i18n.
- Mutations are idempotent where a retry is likely (upload confirm, RSVP submit, webhook).

## Env variables

- Every variable is declared and validated in `src/lib/env.ts` and documented in `.env.example`.
- Server-only secrets never get a `NEXT_PUBLIC_` prefix.

## Tests

- Domain functions: happy path, error, and boundary tests in `tests/unit/`.
- Authorization: a test that a guest or host of another event is refused.
- Tests were written first and seen failing.

## Common mistakes

- Reading `eventId` from the request body and trusting it.
- A migration that fails on a database with existing rows.
- Returning a Prisma model straight to the client, leaking fields such as `pinHash` or `deviceTokenHash`.
- Adding an env variable without `.env.example`.
