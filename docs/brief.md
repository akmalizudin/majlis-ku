# Product Brief: QR Digital Guestbook and E-Invitation Platform

This is the source of the requirements. Values in `[BRACKETS]` are not decided yet; the open
questions are tracked in `docs/specs/phase-1-setup.md`. When the developer decides one, replace
it here and in the affected spec (see the `doc-drift` skill).

## Role

You are a senior full-stack engineer. Build a production-ready web platform, phase by phase. After each phase: run the app, run tests, summarise what was built, and wait for the developer's "continue" before starting the next phase. Ask the developer before adding paid services or changing the stack.

## Product summary

**[BRAND NAME]** (working name: Majlis Ku) is a mobile-first web platform for events (weddings, birthdays, corporate events, parties) in Malaysia. It has two products:

1. **Digital guestbook (live gallery):** The host creates an event and gets one QR code. Guests scan it with their phone and, **without installing an app or creating an account**, can upload photos, videos, voice messages and written wishes. Everything appears in a live gallery that the host (and optionally guests) can view, plus a slideshow mode for a TV/projector at the venue.
2. **E-invitation card with RSVP:** The host picks a template, fills in event details, and shares a link (WhatsApp-friendly). Guests open the card, see details, map, countdown, and submit an RSVP (name, attending yes/no, number of pax, message).

Pricing (configurable in admin): free tier for the guestbook with limits, e-card from **RM[40]**, premium bundle (gallery + e-card) at **RM[120]**.

Languages: **Bahasa Melayu (default) and English**, with a toggle. Currency: MYR. Timezone: Asia/Kuala_Lumpur.

## Tech stack (use unless the developer says otherwise)

- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS, installable as a PWA
- **Database and auth:** PostgreSQL with Prisma (or Supabase); host login via email magic link + Google sign-in
- **Media storage:** S3-compatible object storage (Cloudflare R2 or AWS S3) using **direct-from-browser presigned uploads**
- **Media processing:** compress images client-side before upload; generate thumbnails server-side (sharp); cap video length/size; convert voice notes to a web-friendly format
- **Realtime:** live gallery updates via Server-Sent Events, or Supabase Realtime
- **Payments:** a Malaysian gateway supporting FPX, e-wallets (GrabPay/TNG) and cards, e.g. **[Billplz / ToyyibPay / Stripe]**, behind a `PaymentProvider` interface with verified webhooks
- **QR:** generated server-side as PNG/SVG plus a printable A5/A4 table-stand PDF
- **Deploy:** Docker + **[Vercel / our own server]**, with `.env.example` documenting every variable

## Users and roles

- **Guest:** no account. Identified only by a display name they type once (stored in a cookie/localStorage).
- **Host:** has an account and owns events.
- **Co-host:** invited by the host and can moderate.
- **Admin (us):** manages users, events, payments, templates, pricing and abuse reports.

## Core features

### Guest flow (must work on low-end Android phones and slow 4G)

1. Guest scans the QR code, which opens `/{event-slug}`. Show the event cover, names, date and a welcome message.
2. Guest enters their name and picks an action: Photo, Video, Voice, Wish.
3. Uploads support multiple photos at once, show a progress bar, retry on failure, and resume when the network drops.
4. After uploading, show a thank-you screen and a link to the gallery (if the host made it public).

### Host dashboard

- Create and edit events: title, couple/host names, date, venue, cover photo, theme colour, welcome text.
- Download the QR code (PNG, SVG and printable PDF stand).
- **Live gallery:** grid with filters (photo, video, voice, wish), search by guest name, and sort.
- **Moderation:** hide/delete items, plus an optional "approve before showing" mode.
- **Slideshow mode:** full-screen auto-rotating display for a TV/projector that shows new uploads in real time.
- **Download everything:** a ZIP of all original media, plus a PDF "guestbook" of all wishes.
- **E-card builder:** choose a template, edit text, photos, music, map link (Google Maps/Waze) and countdown, then share the link.
- **RSVP list:** a table with totals (attending, pax) and CSV/Excel export.
- **Usage meter:** storage used and remaining quota for the current plan.

### Plans and limits (store in DB, editable by admin)

| Plan | Guestbook uploads | Video | Storage kept for | E-card |
|---|---|---|---|---|
| Free | [100] items | No | [30] days | No |
| E-card | — | — | — | Yes |
| Premium | Unlimited (fair use) | Yes, ≤ [60]s | [12] months | Yes |

### Admin panel

Users, events, transactions, refunds, template management, pricing, abuse reports, and storage usage.

## Non-functional requirements

- **Privacy / PDPA Malaysia:** consent text on the guest upload screen; galleries are private by default; optional event PIN; host can delete the whole event and all its media; auto-purge media after retention ends.
- **Security:** rate-limit uploads per IP/device; validate file type by magic bytes; enforce size limits; use signed URLs for private media; verify payment webhook signatures; never trust client-side prices.
- **Performance:** guest page under 150 KB JS on first load, lazy-loaded gallery, CDN for media.
- **Accessibility:** large tap targets, good contrast, works in in-app browsers (WhatsApp, Instagram, Threads).
- **Code quality:** strict TypeScript, Zod validation, unit tests for business logic, Playwright e2e test for the guest upload flow and the payment flow (sandbox).

## Build phases

1. **Setup:** scaffold the project, DB schema (User, Event, Upload, Wish, Rsvp, Plan, Payment, Template), auth, i18n, and base layout.
2. **Guestbook MVP:** event creation, QR generation, guest upload (photo + wish), and host gallery.
3. **Media+:** video, voice recording in the browser (MediaRecorder), thumbnails, realtime updates, slideshow.
4. **Moderation and export:** hide/approve, ZIP download, wishes PDF.
5. **E-card and RSVP:** template system (start with 3 templates), share link with good WhatsApp Open Graph previews, RSVP form and export.
6. **Payments and plans:** gateway integration, plan limits enforcement, webhooks, receipts/invoices.
7. **Admin panel.**
8. **Hardening:** rate limits, retention purge job, PDPA pages (privacy policy, terms), e2e tests, Docker, deployment guide.

## Phase 1 kickoff

Before writing code, show the developer: the folder structure, the Prisma schema, and questions about the `[BRACKETED]` values not yet filled in. That proposal is `docs/specs/phase-1-setup.md`.
