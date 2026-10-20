# Phase 4 TDD Plan: Moderation and Export

Spec: `docs/specs/phase-4-moderation-export.md`. Branch: `feat/gallery-moderation-export`.

## Slice 1: moderation rules

- Red: `tests/unit/moderation/rules.test.ts`: `nextModeration` maps approve/hide/show for each state (approve only from waiting; show from hidden; hide from visible or waiting); `canManageMembers` is true for owner and admin only.
- Green: `src/server/moderation/rules.ts`, then `src/server/moderation/service.ts` and `actions.ts`.

## Slice 2: wishes PDF

- Red: `tests/unit/export/wishes-pdf.test.ts`: the PDF starts with `%PDF`, has more pages for more wishes, and `printable` drops emoji but keeps Malay, accents and Arabic script.
- Green: `src/server/export/wishes-pdf.ts`.

## Slice 3: ZIP export

- Red: `tests/unit/export/zip-names.test.ts`: `zipEntryName` puts photos in `gambar/`, videos in `video/`, voice in `suara/`, and makes names unique and safe; `wishesCsv` escapes quotes and new lines.
- Green: `src/server/export/zip.ts`, route `api/events/[id]/export/media`, route `api/events/[id]/export/wishes`.

## Slice 4: members and deletion

- `src/server/events/members.ts` (`inviteCohost`, `removeCohost`), `deleteEventCompletely` in `src/server/events/service.ts`.
- Red: `tests/unit/events/invite.test.ts`: `normalizeInviteEmail` lowercases, trims, and rejects invalid emails.

## Slice 5: UI

- Moderation buttons on gallery tiles, status filter, "Approve all", export buttons, co-host list and invite form, delete-event danger zone.

## Slice 6: e2e

- `tests/e2e/moderation.spec.ts`: with approval on, a guest's photo waits; the guest gallery does not show it; the host approves and it appears; the host hides it and it disappears; delete gives the slot back; the ZIP and PDF download with the right content types; a co-host sees the event and can moderate but cannot delete it; the owner deletes the event and its guest page returns 404.

## Validation

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`, `node scripts/skills.mjs check`.