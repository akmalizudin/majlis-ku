# Phase 1 Spec: Setup

Status: **approved by the developer on 2026-10-20** ("proceed"), with the decisions in section 5.
Requirement source: `docs/brief.md`, phase 1.

## 1. Goal and non-goals

**Goal.** A running Next.js app with the database schema, host auth, i18n (Bahasa Melayu default, English), the base layout, and the test and CI tooling, so phases 2 to 8 can be built in parallel on a stable base.

**Non-goals.** No guest uploads, gallery, QR, e-card, or payments yet. The models for them exist so later phases do not reshape the schema, but no feature code uses them in this phase.

## 2. Acceptance criteria

1. `npm run dev` serves the app at `http://localhost:3000`; `/` shows a landing page in Bahasa Melayu, `/en` the same page in English, with a working language toggle.
2. `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass locally and in CI.
3. `npm run db:start` starts PostgreSQL; `npx prisma migrate dev` creates every table in section 4 on an empty database; `npx prisma db seed` inserts the three plans (Free, E-card, Premium) and three placeholder templates, and is safe to run twice.
4. A host can sign in with an email magic link (dev: the link is printed to the server log) and with Google; a signed-out visit to `/dashboard` redirects to sign-in.
5. A user with `role = ADMIN` can open `/admin`; a host cannot (403 page).
6. Env variables are validated at boot by `src/lib/env.ts`; a missing required variable fails with a message naming it. `.env.example` lists every variable.
7. The guest layout (`/[slug]` placeholder) ships under 150 KB first-load JS, as shown by `npm run build`.
8. The app has a web manifest and icons so it can be installed as a PWA.
9. Unit tests cover: money formatting from sen, date formatting in `Asia/Kuala_Lumpur`, env validation, and the seed's plan values.
10. One Playwright smoke test opens `/` in both locales on a 360 px viewport.

## 3. Folder structure

```
majlis-ku/
├─ CLAUDE.md  AGENTS.md  playbook.md  README.md
├─ .claude/skills/  .codex/skills/          process and guard skills
├─ .github/workflows/ci.yml  .github/pull_request_template.md
├─ .mcp.json  .env.example
├─ docs/brief.md  docs/specs/  docs/plans/
├─ messages/
│  ├─ ms.json                               default locale
│  └─ en.json
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts                               plans, templates, demo host and event (invented data)
├─ public/                                  icons, manifest images
├─ scripts/                                 worktree-add.sh, worktree-cleanup.sh, skills.mjs, db.mjs
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ layout.tsx                      html lang, fonts, theme
│  │  │  ├─ page.tsx                        landing page
│  │  │  ├─ (guest)/[slug]/                 guest event page, upload, thank-you, gallery (phases 2-3)
│  │  │  ├─ (guest)/i/[slug]/               e-card and RSVP (phase 5)
│  │  │  ├─ (host)/dashboard/               host dashboard (phase 2+)
│  │  │  ├─ (host)/slideshow/[eventId]/     venue slideshow (phase 3)
│  │  │  ├─ (admin)/admin/                  admin panel (phase 7)
│  │  │  └─ (auth)/signin/
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts
│  │  │  ├─ uploads/                        presign and confirm (phase 2)
│  │  │  ├─ events/[eventId]/stream/        SSE (phase 3)
│  │  │  └─ webhooks/payments/[provider]/   (phase 6)
│  │  └─ manifest.ts
│  ├─ components/
│  │  ├─ ui/                                buttons, inputs, dialogs (no heavy deps)
│  │  ├─ guest/                             kept light for the 150 KB budget
│  │  └─ host/
│  ├─ server/                               server-only domain logic, unit-tested
│  │  ├─ db.ts                              Prisma client singleton
│  │  ├─ auth/                              Auth.js config, role checks
│  │  ├─ events/  uploads/  wishes/  rsvp/
│  │  ├─ plans/                             limits and quota checks
│  │  ├─ media/                             storage client, presign, thumbnails
│  │  └─ payments/                          PaymentProvider interface + adapters
│  ├─ lib/
│  │  ├─ env.ts                             Zod-validated env
│  │  ├─ money.ts                           sen <-> "RM 40.00"
│  │  ├─ dates.ts                           UTC <-> Asia/Kuala_Lumpur
│  │  ├─ schemas/                           shared Zod schemas
│  │  └─ i18n/                              next-intl routing and request config
│  └─ middleware.ts                         locale routing, auth redirect for /dashboard and /admin
├─ tests/
│  ├─ unit/                                 Vitest
│  └─ e2e/                                  Playwright
├─ next.config.ts  tailwind / postcss config  tsconfig.json (strict)
├─ vitest.config.ts  playwright.config.ts  eslint.config.mjs
└─ package.json  package-lock.json
```

Routing: `next-intl` with `localePrefix: "as-needed"`, so Bahasa Melayu has no prefix (`/{slug}` matches the QR link in the brief) and English lives under `/en/...`.

## 4. Prisma schema (proposal)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------- Enums ----------

enum UserRole {
  HOST
  ADMIN
}

enum EventMemberRole {
  OWNER
  COHOST
}

enum EventType {
  WEDDING
  BIRTHDAY
  CORPORATE
  PARTY
  OTHER
}

enum EventStatus {
  DRAFT
  ACTIVE
  ARCHIVED // retention ended, media purged
}

enum GalleryVisibility {
  PRIVATE // host and co-hosts only (default)
  GUESTS  // anyone with the event link (and PIN, if set)
}

enum Locale {
  ms
  en
}

enum UploadKind {
  PHOTO
  VIDEO
  VOICE
}

enum UploadStatus {
  PENDING    // presigned URL issued, object not confirmed yet
  PROCESSING // object confirmed, thumbnail or transcode running
  READY
  FAILED
}

enum ModerationState {
  VISIBLE
  PENDING_APPROVAL // event has requireApproval on
  HIDDEN
}

enum PlanCode {
  FREE
  ECARD
  PREMIUM
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

// ---------- Auth (Auth.js Prisma adapter) ----------

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  emailVerified DateTime?
  name          String?
  image         String?
  role          UserRole      @default(HOST)
  locale        Locale        @default(ms)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  accounts      Account[]
  sessions      Session[]
  memberships   EventMember[]
  payments      Payment[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ---------- Plans and templates (admin-editable) ----------

model Plan {
  id                String   @id @default(cuid())
  code              PlanCode @unique
  nameMs            String
  nameEn            String
  priceSen          Int      // 0 for Free; 4000 = RM 40.00
  includesGallery   Boolean
  includesEcard     Boolean
  uploadLimit       Int?     // null = unlimited (fair use)
  videoAllowed      Boolean
  maxVideoSeconds   Int?
  maxUploadBytes    BigInt   // per file
  storageLimitBytes BigInt?  // null = fair use
  retentionDays     Int
  active            Boolean  @default(true)
  sortOrder         Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  events   Event[]
  payments Payment[]
}

model Template {
  id         String   @id @default(cuid())
  code       String   @unique // e.g. "classic-songket"
  nameMs     String
  nameEn     String
  previewKey String?  // object key of the preview image
  defaults   Json     // default text, colours, layout options
  premium    Boolean  @default(false)
  active     Boolean  @default(true)
  sortOrder  Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  cards ECard[]
}

// ---------- Events ----------

model Event {
  id                String            @id @default(cuid())
  slug              String            @unique // used in /{slug} and the QR code
  type              EventType         @default(WEDDING)
  status            EventStatus       @default(DRAFT)
  title             String
  hostNames         String            // e.g. "Aisyah & Daniel"
  startsAt          DateTime          // stored UTC, shown in timezone
  endsAt            DateTime?
  timezone          String            @default("Asia/Kuala_Lumpur")
  venueName         String?
  venueAddress      String?
  googleMapsUrl     String?
  wazeUrl           String?
  coverKey          String?           // object key of the cover photo
  themeColor        String            @default("#8B5E3C")
  welcomeText       String?
  defaultLocale     Locale            @default(ms)
  galleryVisibility GalleryVisibility @default(PRIVATE)
  requireApproval   Boolean           @default(false)
  pinHash           String?           // optional event PIN, hashed
  planId            String
  planActivatedAt   DateTime?
  purgeAt           DateTime?         // set from plan retention; purge job deletes media after this
  uploadCount       Int               @default(0)
  storageBytes      BigInt            @default(0)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  plan     Plan          @relation(fields: [planId], references: [id])
  members  EventMember[]
  guests   Guest[]
  uploads  Upload[]
  wishes   Wish[]
  rsvps    Rsvp[]
  card     ECard?
  payments Payment[]

  @@index([status, purgeAt])
}

model EventMember {
  eventId   String
  userId    String
  role      EventMemberRole
  createdAt DateTime        @default(now())

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([eventId, userId])
  @@index([userId])
}

// A guest has no account: a display name plus a device token cookie, scoped to one event.
model Guest {
  id              String   @id @default(cuid())
  eventId         String
  displayName     String
  deviceTokenHash String   // hash of the cookie token; never the raw token
  createdAt       DateTime @default(now())

  event   Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  uploads Upload[]
  wishes  Wish[]

  @@unique([eventId, deviceTokenHash])
}

// ---------- Guestbook content ----------

model Upload {
  id           String          @id @default(cuid())
  eventId      String
  guestId      String?         // null if the guest record was removed
  guestName    String          // snapshot at upload time, for search and export
  kind         UploadKind
  status       UploadStatus    @default(PENDING)
  moderation   ModerationState @default(VISIBLE)
  objectKey    String          @unique // original, private
  thumbKey     String?
  displayKey   String?         // web-friendly version (EXIF stripped image, transcoded voice)
  mimeType     String
  sizeBytes    BigInt
  durationSec  Int?            // video and voice
  width        Int?
  height       Int?
  caption      String?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  event Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  guest Guest? @relation(fields: [guestId], references: [id], onDelete: SetNull)

  @@index([eventId, moderation, createdAt])
  @@index([eventId, kind, createdAt])
}

model Wish {
  id         String          @id @default(cuid())
  eventId    String
  guestId    String?
  guestName  String
  message    String          @db.Text
  moderation ModerationState @default(VISIBLE)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  event Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  guest Guest? @relation(fields: [guestId], references: [id], onDelete: SetNull)

  @@index([eventId, moderation, createdAt])
}

// ---------- E-card and RSVP ----------

model ECard {
  id          String    @id @default(cuid())
  eventId     String    @unique
  templateId  String
  content     Json      // text, photos (object keys), colours, countdown, map links
  musicKey    String?
  published   Boolean   @default(false)
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  event    Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  template Template @relation(fields: [templateId], references: [id])
}

model Rsvp {
  id              String   @id @default(cuid())
  eventId         String
  name            String
  phone           String?  // optional, only if the host asks for it
  attending       Boolean
  pax             Int      @default(1)
  message         String?  @db.Text
  deviceTokenHash String?  // lets a guest edit their own RSVP
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([eventId, createdAt])
}

// ---------- Payments ----------

model Payment {
  id          String        @id @default(cuid())
  eventId     String
  userId      String
  planId      String
  amountSen   Int           // computed on the server from the plan
  currency    String        @default("MYR")
  provider    String        // "billplz" | "toyyibpay" | "stripe"
  providerRef String?       @unique // bill or session id; makes webhooks idempotent
  status      PaymentStatus @default(PENDING)
  receiptNo   String?       @unique
  paidAt      DateTime?
  refundedAt  DateTime?
  raw         Json?         // last verified provider payload
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  event Event @relation(fields: [eventId], references: [id], onDelete: Restrict)
  user  User  @relation(fields: [userId], references: [id], onDelete: Restrict)
  plan  Plan  @relation(fields: [planId], references: [id])

  @@index([status, createdAt])
}
```

Notes on the design:

- **Co-hosts** use `EventMember` (`OWNER` or `COHOST`) instead of a field on `Event`, so one host can own many events and invite several co-hosts.
- **Guest** is a separate model so uploads, wishes, rate limits, and "my uploads" can be tied to a device without an account. `guestName` is also copied onto each item so search and export keep working if the guest row is removed.
- **Counters** (`uploadCount`, `storageBytes`) on `Event` make quota checks one row read; they are updated in the same transaction that confirms an upload.
- **Payments are `Restrict` on delete**, so financial records survive when a host deletes an event; deleting an event first anonymises its payments (phase 6 decides the exact rule with the developer).
- **Added later, not in phase 1:** `AbuseReport` and `AuditLog` (phase 7), invoice numbering details (phase 6).

## 5. Decisions (2026-10-20)

The developer asked to get the whole system working locally first and to leave money and hosting for later. Defaults taken:

1. **Brand name:** "Majlis Ku" (working name; one constant in `src/lib/brand.ts`).
2. **Prices and limits:** the brief's values are seeded (Free 100 items and 30 days, E-card RM 40, Premium RM 120 with video up to 60 s and 12 months). Per-file caps: photo 15 MB, video 200 MB, voice 10 MB. Admin can edit them.
3. **Payment gateway:** deferred. No `PaymentProvider` adapter yet; an admin can set an event's plan by hand.
4. **Deploy target:** local only for now. No Dockerfile in phase 1.
5. **Database and auth:** Prisma 6 + PostgreSQL + Auth.js v5. Locally, `npm run db:start` runs a real PostgreSQL through `embedded-postgres` (no Docker or installer needed).
6. **Media storage:** a `StorageDriver` interface. Phase 2 ships the `local` driver (files under `.data/media/`, upload and download URLs signed by the app with HMAC). The S3/R2 driver is added when hosting is decided.
7. **Magic-link email:** printed to the server log when `EMAIL_SERVER` is empty; SMTP when it is set.
8. **Package manager:** npm.
9. **Versions:** Next.js 15.5, React 19, Prisma 6.19, Auth.js 5 beta, next-intl 4, Tailwind 4, Zod 4, TypeScript 5.9, Vitest 3, Playwright.

## 6. Env variables (phase 1)

`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `EMAIL_SERVER`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`, `HASH_SALT`. Storage and payment variables are listed in `.env.example` now and become required in phases 2 and 6.

## 7. Alternatives considered

- **Supabase instead of Prisma + Auth.js:** faster start with built-in realtime and storage, but ties auth, storage, and realtime to one vendor. Kept as option in question 5.
- **WebSockets instead of SSE:** two-way is not needed; SSE works through proxies and in in-app browsers with less code.
- **Locale always in the URL (`/ms/...`):** rejected so the QR link stays `/{slug}`.

## 8. Rollout

After merging phase 1, teammates run `npm install`, copy `.env.example` to `.env`, `npm run db:start` (keep it running), `npx prisma migrate dev`, `npx prisma db seed`, then `npm run dev`.