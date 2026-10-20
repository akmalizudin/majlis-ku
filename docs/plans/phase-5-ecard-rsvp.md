# Phase 5 TDD Plan: E-card and RSVP

Spec: `docs/specs/phase-5-ecard-rsvp.md`. Branch: `feat/ecard-rsvp`.

## Slice 1: card content

- Red: `tests/unit/ecard/content.test.ts`: `cardInputSchema` accepts a full card, trims text, caps schedule at 6 and contacts at 3, rejects a bad phone, a pax limit of 0 or 21; `parseCardContent` turns old or broken JSON into safe defaults; `whatsappLink` builds `https://wa.me/60…` from Malaysian numbers (`012-345 6789`, `+60 12 345 6789`).
- Green: `src/lib/schemas/card.ts`.

## Slice 2: RSVP rules

- Red: `tests/unit/rsvp/rules.test.ts`: `rsvpInputSchema` forces pax 0 when not attending and 1..max when attending; `rsvpOpen` is false after the deadline (end of that day in Malaysia time) or when RSVP is off; `rsvpTotals` adds replies, attending, pax, declined.
- Green: `src/server/rsvp/rules.ts`, then `src/server/rsvp/service.ts` (`submitRsvp` updates the reply from the same device).

## Slice 3: calendar and exports

- Red: `tests/unit/ecard/ics.test.ts`: the `.ics` has `DTSTART` in UTC, a 4-hour default length, escaped commas and new lines, CRLF line ends. `tests/unit/rsvp/export.test.ts`: CSV header and rows; the XLSX buffer starts with `PK` and has a totals row.
- Green: `src/server/ecard/ics.ts`, `src/server/rsvp/export.ts`.

## Slice 4: routes and pages

- Card builder page and form, card asset routes, public card page with template rendering, countdown, music, RSVP form, OG image, ICS route, RSVP list page and export route.

## Slice 5: e2e

- `tests/e2e/ecard.spec.ts`: the demo host builds and publishes a card with RSVP on; a guest opens `/i/demo-aisyah-daniel`, sees the names and the map buttons, RSVPs for 3, changes it to 2; the host sees one reply with 2 pax and downloads CSV and XLSX; the page has `og:title` and an absolute `og:image` that returns a PNG; a Free event's card URL returns 404.

## Validation

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (card route < 150 KB), `npm run test:e2e`, `node scripts/skills.mjs check`.