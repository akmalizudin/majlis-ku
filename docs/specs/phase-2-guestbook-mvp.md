# Phase 2 Spec: Guestbook MVP

Status: approved under the developer's 2026-10-20 instruction to build the whole system locally ("proceed").
Requirement source: `docs/brief.md`, phase 2: event creation, QR generation, guest upload (photo + wish), host gallery.

## 1. Goal and non-goals

**Goal.** A host creates an event, downloads its QR code, and guests who scan it can add photos and wishes without an account. The host sees everything in a gallery.

**Non-goals.** Video, voice, realtime updates, slideshow (phase 3). Hide/approve actions, ZIP and PDF export (phase 4). E-card and RSVP (phase 5). Payments (deferred).

## 2. Acceptance criteria

Host:

1. `/dashboard` lists the events the host owns or co-hosts, newest first, with a "New event" button.
2. `/dashboard/events/new` creates an event from: type, title, host names, date and time (Kuala Lumpur), venue name and address, Google Maps and Waze links, welcome text, theme colour. The slug is generated from the host names plus a short random suffix; reserved words (`dashboard`, `admin`, `signin`, `api`, `en`, `ms`, `i`, `slideshow`, `privacy`, `terms`) are never used. New events get the Free plan, status `ACTIVE`, and `purgeAt = max(now, startsAt) + plan.retentionDays`.
3. `/dashboard/events/[id]` shows the share link, a QR preview, downloads (PNG, SVG, printable A5 and A4 PDF stand), and a usage meter (items used of the plan limit, storage used).
4. `/dashboard/events/[id]/edit` edits the same fields plus the cover photo, gallery visibility (private or guests), "approve before showing", and an optional 4 to 8 digit PIN (stored hashed; empty removes it).
5. `/dashboard/events/[id]/gallery` shows photos and wishes in one grid, with filters (all, photos, wishes), search by guest name, and sort (newest, oldest), paged 30 at a time.
6. Only the event's owner and co-hosts can see or change any of this; anyone else gets a 404.

Guest:

7. `/{slug}` shows the cover, host names, date, venue, welcome text, and, once the guest has typed a display name (1 to 40 characters), the actions Photo and Wish (Video and Voice show "coming soon" until phase 3).
8. If the event has a PIN, the guest must enter it first; five wrong tries in 10 minutes from one device lock PIN entry for 10 minutes.
9. The upload screen shows the consent text (both languages) before the first upload.
10. Photos: several at once; each is compressed in the browser (longest side 2560 px, JPEG), uploaded with a progress bar, retried automatically on failure (3 tries with back-off), and re-queued when the browser comes back online.
11. The server issues an upload URL only when the plan includes the gallery, the item limit is not reached (counting pending uploads), the declared type is an allowed image type, and the size is within the plan's per-file cap and the 15 MB photo cap.
12. On completion the server checks the real file type by magic bytes and the real size, strips EXIF (including GPS) for the display copy, makes a thumbnail, and marks it `READY`. A mismatch marks it `FAILED` and deletes the object. Counters (`uploadCount`, `storageBytes`) change in the same transaction.
13. Wishes: 1 to 1000 characters, saved with the guest's name.
14. After uploading, the guest sees a thank-you screen with a link to the gallery when the host made it public.
15. `/{slug}/gallery` shows visible items to guests only when gallery visibility is `GUESTS` (and the PIN, if any, was entered); otherwise 404.
16. Media is only ever served through signed, expiring URLs created after an access check.

## 3. Data model

No schema change is needed beyond phase 1. `Upload.objectKey` is `events/<eventId>/<uploadId>/original`; display and thumbnail copies sit next to it (`display.jpg`, `thumb.webp`).

## 4. API contract

| Route | Who | Input (Zod) | Output | Errors |
| --- | --- | --- | --- | --- |
| Server action `createEvent` | host | event form | redirect to the event page | `validation` |
| Server action `updateEvent` | owner, co-host | event form + settings | redirect | `validation`, `not_found` |
| `POST /api/events/[id]/cover` | owner, co-host | `{ mimeType, sizeBytes }` | `{ uploadUrl, key }` then `PUT`, then `POST .../cover/complete` | `not_found`, `invalid_type`, `too_large` |
| `GET /api/events/[id]/qr?format=png\|svg` | owner, co-host | | image | `not_found` |
| `GET /api/events/[id]/qr/stand?size=a5\|a4` | owner, co-host | | PDF | `not_found` |
| `POST /api/e/[slug]/guest` | anyone | `{ displayName }` | `{ guestId, displayName }` and the device cookie | `not_found`, `pin_required` |
| `POST /api/e/[slug]/pin` | anyone | `{ pin }` | 204 and a signed PIN cookie | `invalid_pin`, `locked` |
| `POST /api/e/[slug]/uploads` | guest of the event | `{ kind: "PHOTO", mimeType, sizeBytes }` | `{ uploadId, uploadUrl, method, headers }` | `not_guest`, `gallery_not_in_plan`, `limit_reached`, `invalid_type`, `too_large`, `rate_limited` |
| `POST /api/e/[slug]/uploads/[id]/complete` | the guest who started it | | `{ status }` | `not_found`, `invalid_file` |
| `POST /api/e/[slug]/wishes` | guest of the event | `{ message }` | `{ wishId }` | `not_guest`, `validation`, `rate_limited` |
| `PUT /api/storage/upload?key&exp&max&sig` | holder of a signed URL | raw bytes | 204 | `expired`, `bad_signature`, `too_large` |
| `GET /api/storage/file?key&exp&sig` | holder of a signed URL | | the file | `expired`, `bad_signature` |

Errors use `{ error: { code, message } }`.

## 5. Plans and money

No money in this phase. Limits come from the event's `Plan` row: `includesGallery`, `uploadLimit` (null is unlimited), `maxUploadBytes`, `storageLimitBytes`. Pure function `checkUploadAllowed` in `src/server/plans/limits.ts`.

## 6. Privacy

Guest gives a display name only. The device cookie (`mk_device`, httpOnly, 1 year, random 32 bytes) is stored only as a salted hash. EXIF is stripped from display copies; originals stay private to hosts. Rate-limit keys use the device hash or a salted IP hash; no raw IP is stored.

## 7. Guest experience

The guest page ships one client component (`GuestActions`) with the name form, the upload queue, and the wish form, with no third-party client libraries. Image compression uses the browser's canvas. Budget: under 150 KB first-load JS. All strings in `messages/ms.json` and `messages/en.json`.

## 8. Env and services

`STORAGE_DRIVER=local` and `LOCAL_MEDIA_DIR=.data/media`. Signed URLs use an HMAC key derived from `AUTH_SECRET`. New packages: `qrcode`, `pdfkit`, `sharp`, `file-type` (all server-only).

## 9. Alternatives considered

- Uploading through the Next server instead of signed URLs: simpler, but would not match the S3/R2 path later. The local driver keeps the same signed-URL shape.
- `browser-image-compression`: about 40 KB more JS on the guest page; the canvas does what we need.

## 10. Rollout

`npm install`; no migration. `.data/media/` is created on first upload.