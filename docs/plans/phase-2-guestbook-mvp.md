# Phase 2 TDD Plan: Guestbook MVP

Spec: `docs/specs/phase-2-guestbook-mvp.md`. Branch: `feat/guest-guestbook-mvp`.

Scope boundary: no video, voice, realtime, moderation actions, export, e-card, or payments. Must not change `prisma/schema.prisma`.

## Slice 1: event domain

- Red: `tests/unit/events/slug.test.ts` (`slugify` handles Malay names, `&`, accents and emoji; `makeSlug` appends a 5-character suffix; never returns a reserved word), `tests/unit/events/retention.test.ts` (`computePurgeAt` uses the later of now and the event date).
- Green: `src/server/events/slug.ts`, `src/server/events/retention.ts`.
- Then `src/lib/schemas/event.ts` (Zod form schema) with `tests/unit/schemas/event.test.ts` (valid form, bad colour, bad URL, PIN format), and `src/server/events/service.ts` (create, update, list, `getEventForMember`).

## Slice 2: plan limits

- Red: `tests/unit/plans/limits.test.ts`: gallery not in plan, at limit, one under, unlimited, pending counted, too large for plan, too large for kind, storage limit, video not allowed.
- Green: `src/server/plans/limits.ts`.

## Slice 3: storage and media

- Red: `tests/unit/media/signing.test.ts` (sign and verify, expired, tampered key, tampered max), `tests/unit/media/file-check.test.ts` (JPEG, PNG, WebP magic bytes accepted; a text file renamed `.jpg` rejected), `tests/unit/media/images.test.ts` (sharp makes a thumbnail no wider than 400 px and a display copy without EXIF).
- Green: `src/server/media/signing.ts`, `src/server/media/storage.ts` (`StorageDriver`, local driver), `src/server/media/file-check.ts`, `src/server/media/images.ts`, routes `api/storage/upload` and `api/storage/file`.

## Slice 4: guest identity, PIN, rate limit

- Red: `tests/unit/guests/identity.test.ts` (token hash stable with the salt; display name trimmed, 1 to 40 characters), `tests/unit/guests/pin.test.ts` (hash and verify, PIN cookie signature tied to the event), `tests/unit/security/rate-limit.test.ts` (fixed window: allows N, blocks N+1, resets after the window).
- Green: `src/server/guests/identity.ts`, `src/server/guests/pin.ts`, `src/server/security/rate-limit.ts`.

## Slice 5: guest routes and uploads

- `api/e/[slug]/guest`, `pin`, `uploads`, `uploads/[id]/complete`, `wishes`; `src/server/uploads/service.ts` (`startUpload`, `completeUpload` with the transaction), `src/server/wishes/service.ts`.
- Red: `tests/unit/uploads/allowed-types.test.ts` for the kind and type table.

## Slice 6: QR and stand

- Red: `tests/unit/qr/qr.test.ts` (PNG starts with the PNG signature; SVG contains the event URL's QR; PDF stand starts with `%PDF`).
- Green: `src/server/qr/qr.ts`, routes `api/events/[id]/qr` and `qr/stand`.

## Slice 7: pages

- Host: dashboard list, new, event overview, edit (with cover upload), gallery.
- Guest: event page with `GuestActions`, thank-you state, guest gallery.

## Slice 8: e2e

- `tests/e2e/guestbook.spec.ts`: host creates an event and downloads the QR PNG; a guest opens it, enters a name, uploads a photo, writes a wish, sees the thank-you screen; the host sees both in the gallery; another host gets 404 on that event.

## Validation

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (guest routes < 150 KB), `npm run test:e2e`, `node scripts/skills.mjs check`.