# Phase 5 Spec: E-card and RSVP

Status: approved under the developer's 2026-10-20 instruction to build the whole system locally ("proceed").
Requirement source: `docs/brief.md`, phase 5: template system (3 templates), share link with good WhatsApp Open Graph previews, RSVP form and export.

## 1. Goal and non-goals

**Goal.** A host designs an invitation card from a template, shares one link, and collects RSVPs with totals and exports.

**Non-goals.** Payment for the E-card plan (deferred; an admin sets the plan). Sending invitations by SMS or email.

## 2. Acceptance criteria

Host (`/dashboard/events/[id]/card`, plans with `includesEcard` only; otherwise a locked notice):

1. Picks one of the active templates (seeded: Klasik Songket, Moden Minimal, Taman Bunga) and sees its colours.
2. Edits: headline, opening text, host line (for example the parents' names), the names, a note (dress code, prayers), up to 6 schedule rows (time and label), up to 3 contacts (name and phone, shown as WhatsApp links), and whether to link the guestbook. Date, venue and map links come from the event.
3. Uploads up to 3 card photos (JPEG/PNG/WebP, 15 MB, re-encoded without EXIF) and one music file (MP3 or M4A, 10 MB, magic bytes checked).
4. RSVP settings: on or off, a deadline (optional), maximum pax per reply (1 to 20), and whether to ask for a phone number.
5. Publishes or unpublishes the card; the share link is `/i/{slug}` with a WhatsApp share button.

Guest (`/i/{slug}`, no account):

6. Sees the card in the chosen template: names, date and time in Malaysia time, venue with Google Maps and Waze buttons, a live countdown, schedule, note, contacts, photos, an optional music button (never autoplays), "Add to calendar" (`.ics`), and a link to the guestbook if the host chose it.
7. RSVP: name, attending yes or no, pax (1 to the host's maximum, only when attending), phone if asked, message. Sending again from the same device updates the earlier reply. After the deadline the form is closed.
8. Link previews in WhatsApp, Facebook and Telegram show the names, date and a 1200x630 image (`og:image`, absolute URL, public, cached).
9. An unpublished card, or a plan without the e-card, returns 404.

RSVP list (`/dashboard/events/[id]/rsvp`):

10. Totals: replies, attending replies, total pax attending, not attending. A table with name, attending, pax, phone, message and time; filter attending / not attending.
11. Export as CSV (UTF-8 with BOM, formula-safe) and Excel (`.xlsx`) with a totals row.

## 3. Data model

No schema change: `ECard.content` (Zod-validated JSON), `ECard.musicKey`, `Rsvp` as in phase 1. Card photos are stored at `events/<eventId>/card/<random>.jpg`, music at `events/<eventId>/card/music.<ext>`.

## 4. API contract

| Route or action | Who | Notes |
| --- | --- | --- |
| Server action `saveCard(eventId, input)` | owner, co-host, admin | Zod `cardInputSchema` |
| `POST/DELETE /api/events/[id]/card/photo` | owner, co-host, admin | multipart `file`; DELETE `?key=` |
| `POST/DELETE /api/events/[id]/card/music` | owner, co-host, admin | multipart `file` |
| `POST /api/e/[slug]/rsvp` | anyone with the link | `{ name, attending, pax, phone?, message? }`; rate-limited per device |
| `GET /api/e/[slug]/ics` | anyone, card published | `text/calendar` |
| `GET /i/[slug]/opengraph-image` | anyone, card published | PNG 1200x630 |
| `GET /api/events/[id]/rsvp/export?format=csv\|xlsx` | owner, co-host, admin | file |

## 5. Privacy

RSVP phone numbers are optional, asked only when the host turns it on, shown only to hosts, and deleted with the event. The OG image contains only names and the date, never photos.

## 6. Guest experience

The card page's client code is the countdown, the music button and the RSVP form only. Budget under 150 KB first-load JS; strings in both languages.

## 7. Rollout

`npm install` (adds `exceljs`). No migration.