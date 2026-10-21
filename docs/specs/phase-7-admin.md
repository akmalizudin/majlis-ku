# Phase 7 Spec: Admin panel

Status: approved by the developer on 2026-10-21. Reviewed by the final reviewer on 2026-10-21; its findings are folded in.
Requirement source: `docs/brief.md`, "Admin panel": users, events, transactions, refunds, template management, pricing, abuse reports, and storage usage. Plans and prices are "store in DB, editable by admin".

Decisions taken with the developer on 2026-10-21:

1. Abuse: an admin can **suspend** an event (reversible) and **delete** it (permanent).
2. Changing an event's plan **recomputes `purgeAt`** from the new plan's retention.
3. Storage usage is the **sum of `Event.storageBytes`** (original uploads only, read from the database).
4. Users page is **list and search only**.
5. Suspension **cuts guests off**, including open live-gallery streams; the host's dashboard and venue slideshow keep working.
6. Admins are **read-only on host dashboards**: they can view any event there, but every change, export and delete goes through `/admin` and is audited.
7. Admin access is **checked against `ADMIN_EMAILS` on every request**: removing an email revokes access at once.

## 1. Goal and non-goals

**Goal.** An admin can find any user or event, set an event's plan by hand, suspend or delete an abusive event, act on guest abuse reports, edit plans and prices, manage e-card templates, see storage usage, and see who did what in an audit log.

**Non-goals.**

- Transactions and refunds (phase 6, deferred with payments). The admin nav has no payments page yet.
- Granting admin from the UI, or suspending users.
- Exact storage including thumbnails, display copies, covers and card media.
- Reporting a single photo or wish (a report is about an event; the guest describes the item in the text).
- Hiding a single item as an admin (the admin suspends or deletes the event; the host moderates items).
- Creating or deleting plans (the three `PlanCode`s stay fixed); deleting templates (cards reference them).
- Uploading template preview images (`Template.previewKey` stays unused).
- Notifying the host by email when an event is suspended.

## 2. Acceptance criteria

Access:

1. A user can use `/admin` only when `role = ADMIN` **and** their email is in `ADMIN_EMAILS`, checked on every request (`canAccessAdmin(user, adminEmails)`). Removing an email from `ADMIN_EMAILS` takes effect on the next request, with no database edit. The same check decides whether `getEventForMember` gives a user the implicit `ADMIN` role on events.
2. Every `/admin/*` page and every admin server action checks this on the server. A signed-in non-admin gets the existing "access denied" view on every `/admin/*` page, and every admin action returns `forbidden`. Signed-out visitors are sent to `/signin`.
3. An admin layout shows a nav: Overview, Events, Users, Reports, Plans, Templates, Audit log. Labels come from i18n in both languages.

Admins on host dashboards (read-only):

4. An admin who is not a member of an event can open its dashboard pages, gallery, RSVP list, card builder and slideshow, but every mutation and export is refused for the `ADMIN` role: event edit and settings, cover upload, card save, card photo and music, moderation (approve, hide, show, delete, approve all), co-host invites and removal, delete event, ZIP media export, wishes PDF and CSV, RSVP CSV and Excel. Server actions return their existing `forbidden` (or form error) result; API routes return 403. `canModerate`, `canManageMembers` and `canDeleteEvent` no longer allow `ADMIN`, and a new `canEditEvent` (owner or co-host) guards the event edit, settings, cover and export paths. Owners and co-hosts are unaffected. QR downloads stay allowed (read-only).

Overview (`/admin`):

5. Shows counts of users, events by status (draft, active, suspended, archived), events by plan, open abuse reports, and total storage (sum of `Event.storageBytes`, labelled "original uploads"), plus the 10 events using the most storage with links to them.

Events (`/admin/events`, `/admin/events/[id]`):

6. The list searches by slug, title, host names or owner email (case-insensitive, `?q=`), filters by status and plan, sorts newest first, and pages 50 at a time (`?page=`). Each row shows title, slug, owner email, plan, status, event date in Malaysia time, upload count and storage.
7. The detail page shows the same fields plus `purgeAt`, members, the open reports for this event, and links to the host dashboard for the event (read-only for the admin) and the guest page.
8. **Change plan**: allowed for `ACTIVE` and `SUSPENDED` events (otherwise `invalid_status`). The admin picks an active plan. The server sets `planId`, `planActivatedAt = now` and `purgeAt = computePurgeAt({ startsAt, retentionDays: newPlan.retentionDays })`, and writes an audit entry with the old and new plan codes. The current plan, an inactive plan or an unknown plan is rejected (`same_plan`, `invalid_plan`).
9. Effects of a plan change follow the existing live plan checks, with no extra code: existing uploads stay after a downgrade; new uploads are checked against the new plan by `checkUploadAllowed` (a Premium event with 150 uploads moved to Free gets `limit_reached` on the next upload; a Free event at 100 uploads moved to Premium accepts the 101st). Moving to a plan without the e-card makes the public card, `.ics` and RSVP return 404 and the builder show the locked notice; RSVPs already received stay. Moving to a plan without the gallery (E-card) refuses new guest uploads and wishes; items already in the gallery stay visible to the host, and to guests if the gallery is public.
10. **Suspend**: allowed only from `ACTIVE`, else `invalid_status`. Sets `status = SUSPENDED`, `suspendedAt = now`, and publishes a "closed" message on the realtime bus for the event.
11. While suspended: the guest page, guest gallery, report page, public card, OG image, `.ics`, RSVP and every guest API return 404 (they all go through `findGuestEvent`, which returns `ACTIVE` events only). Open guest live-gallery streams close on the "closed" message, and their reconnect gets 404. Signed media URLs already sent to a guest's browser keep working until they expire (up to 1 hour, `MEDIA_URL_TTL_SEC`). An upload URL issued before the suspension can still write its file for up to 15 minutes (`UPLOAD_URL_TTL_SEC`), but confirming it returns 404, so it never becomes visible.
12. The host and co-hosts keep the dashboard, moderation, exports, delete and the venue slideshow, with a banner: "This event has been suspended by Majlis Ku. Guests cannot open it." Host live streams are not closed. The host cannot unsuspend.
13. **Unsuspend**: allowed only from `SUSPENDED`, else `invalid_status`. Sets `status = ACTIVE`, `suspendedAt = null`. Guest pages work again.
14. **Delete**: the admin types the event slug to confirm. The server calls the existing `deleteEventCompletely` (storage prefix, then the event row and its cascades, including its reports). A wrong slug returns `confirm`; an event with payments returns `has_payments`. The audit entry (with the slug) is written only after the delete succeeds; then the admin is sent to `/admin/events`. Any delete (by an admin or the host) publishes "closed" so open guest live streams end, as on suspension.

Users (`/admin/users`):

15. Searches by email or name (`?q=`), newest first, 50 per page. Each row shows email, name, role, whether the email is currently in `ADMIN_EMAILS`, sign-up date and the number of events owned; the count links to the events list filtered by that owner (`?q=<email>`).

Abuse reports (guest side):

16. The guest event page, the guest gallery and the public card show a small "Report this event" text link at the bottom, pointing to `/{slug}/report` in the current locale. It adds no client JavaScript.
17. `/{slug}/report` is a server-rendered form, not gated by the event PIN: a reason (radio: sexual content, violence, hate or harassment, scam or spam, privacy (my photo or data was shared without permission), copyright, other) and optional details (up to 1000 characters). It asks for no name, email or phone. It works with JavaScript disabled and has the locale toggle.
18. Every submission counts toward a limit of 5 per 10 minutes per salted IP hash, checked before validation; over the limit, nothing is stored and the page shows "Too many reports, try again later". A missing or unknown reason, or details over 1000 characters, re-shows the form with an error. A valid submission creates an `AbuseReport` with status `OPEN` and shows a thank-you message. An unknown, draft, suspended or archived event returns 404.

Abuse reports (admin side, `/admin/reports`):

19. Lists reports filtered by status (open by default, resolved, dismissed, all), newest first, 50 per page, with the event title and slug linking to the admin event page, the reason, the details and the time.
20. The admin marks a report **resolved** or **dismissed** (from `OPEN` only, else `invalid_status`). The server records `handledById` and `handledAt` and writes an audit entry. Resolving does not suspend; suspending is a separate action on the event page.

Plans (`/admin/plans`):

21. Lists the three plans. Editable, with server-side ranges:
    - names (Malay and English, 1 to 60 characters);
    - price in ringgit, stored as integer sen through `parseRinggit` (RM 0 to RM 10,000; a non-numeric or negative price is a `validation` error, never a thrown `RangeError`);
    - upload limit (blank = unlimited, else 0 to 100,000);
    - video allowed;
    - max video seconds (blank = 60 s, the current default; else 1 to 600);
    - max upload size per file in MB (1 to 200; the page notes that the per-kind caps of 15 MB photo, 10 MB voice and 200 MB video still apply);
    - storage limit in MB (blank = unlimited, else 1 to 1,048,576);
    - retention days (1 to 3650);
    - active; sort order.

    `code`, `includesGallery` and `includesEcard` are shown but not editable.
22. Invalid input re-shows the form with the failing fields. The Free plan must stay active with a price of RM 0 (`free_required`), because every new event starts on it.
23. Edits apply to every event on that plan immediately (limits are read live). Changing retention days does not recompute `purgeAt` for existing events at once; an event picks up the new retention the next time its host edits it (`updateEvent` recomputes from the live plan) or an admin changes its plan. The page says so. The audit entry records the changed fields with old and new values (byte limits recorded as MB numbers).
24. The host event overview shows an upload limit of 0 as "0", not as unlimited (fixes the falsy check in the event overview page).

Templates (`/admin/templates`):

25. Lists all templates (active and inactive) with a colour preview. The admin creates a template (code: lowercase letters, digits and hyphens, 3 to 40 characters, unique, else `code_taken`, including when two admins race) or edits one: names (Malay and English), layout (classic, modern, floral), font (serif, sans), primary, background and accent colours (`#rrggbb`), active, sort order. The style is stored in `Template.defaults` in the shape `templateStyleSchema` reads.
26. The last active template cannot be deactivated (`last_active_template`); the check and the update run in one transaction.
27. Deactivating a template hides it from the card builder for new choices, but a card already using it keeps rendering, the builder still shows it as the selected tile, and its host can still save the card without switching. `saveCard` accepts a template that is active or is the card's current one; any other inactive or unknown template is still `invalid_template`.

Audit log (`/admin/audit`):

28. Every admin mutation in this spec that changes something writes one `AuditLog` row in the same transaction as the change (delete: right after it succeeds). A plan save that changes no field writes none. The page lists entries newest first, 50 per page, with time in Malaysia time, actor email, action, target, and a readable summary of `details`.

## 3. Data model

One migration, `admin_panel`:

```prisma
enum EventStatus {
  DRAFT
  ACTIVE
  ARCHIVED
  SUSPENDED // set by an admin; hidden from guests, reversible
}

model Event {
  // ...existing fields
  suspendedAt DateTime?
  reports     AbuseReport[]
}

enum ReportReason {
  SEXUAL
  VIOLENCE
  HATE
  SCAM
  PRIVACY
  COPYRIGHT
  OTHER
}

enum ReportStatus {
  OPEN
  RESOLVED
  DISMISSED
}

model AbuseReport {
  id          String       @id @default(cuid())
  eventId     String
  reason      ReportReason
  details     String?      // guest-written, max 1000 chars; no contact details asked
  status      ReportStatus @default(OPEN)
  handledById String?
  handledAt   DateTime?
  createdAt   DateTime     @default(now())

  event     Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  handledBy User? @relation("ReportsHandled", fields: [handledById], references: [id], onDelete: SetNull)

  @@index([status, createdAt])
  @@index([eventId])
}

enum AuditAction {
  EVENT_PLAN_CHANGED
  EVENT_SUSPENDED
  EVENT_UNSUSPENDED
  EVENT_DELETED
  REPORT_RESOLVED
  REPORT_DISMISSED
  PLAN_UPDATED
  TEMPLATE_CREATED
  TEMPLATE_UPDATED
}

model AuditLog {
  id         String      @id @default(cuid())
  actorId    String?
  action     AuditAction
  targetType String      // "event" | "report" | "plan" | "template"
  targetId   String      // no foreign key: the target may be deleted later
  details    Json        // ids, slugs, codes, old and new values (numbers and strings only, no BigInt); never guest names or messages
  createdAt  DateTime    @default(now())

  actor User? @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@index([targetType, targetId])
}
```

`User` gains the two back-relations (`reportsHandled`, `auditEntries`). Existing rows need no backfill: every new column is nullable or has a default, and `ALTER TYPE ... ADD VALUE` does not touch existing rows (the migration does not use the new value, so it is safe inside Prisma's transaction). No code switches exhaustively on `EventStatus`.

## 4. API contract

All admin mutations are server actions in `src/server/admin/actions.ts`, following the existing `(locale, id, prevState, formData)` pattern where a form drives them. Each one: checks `auth()` and `canAccessAdmin(user, env().ADMIN_EMAILS)`, parses the named `FormData` fields (not `Object.fromEntries`, so Next.js `$ACTION_*` keys are ignored) with a strict Zod schema from `src/lib/schemas/admin.ts`, loads the target by the id in the arguments, calls a domain function in `src/server/admin/`, writes the audit entry, and calls `revalidatePath("/", "layout")`.

Result type, same shape as `SaveCardResult`:

```ts
type AdminResult = { ok: true } | { ok: false; error: AdminError; fields?: string[] };
type AdminError =
  | "forbidden" | "validation" | "not_found"
  | "invalid_plan" | "same_plan" | "invalid_status" | "confirm" | "has_payments"
  | "free_required" | "code_taken" | "last_active_template";
```

| Action | Input | Errors |
| --- | --- | --- |
| `changeEventPlanAction(eventId, prev, formData)` | `{ planCode: PlanCode }` | forbidden, not_found, invalid_status, invalid_plan, same_plan |
| `suspendEventAction(eventId)` | none | forbidden, not_found, invalid_status |
| `unsuspendEventAction(eventId)` | none | forbidden, not_found, invalid_status |
| `adminDeleteEventAction(locale, eventId, prev, formData)` | `{ confirmSlug: string }` | forbidden, not_found, confirm, has_payments; redirects to `/admin/events` on success |
| `handleReportAction(reportId, formData)` | `{ outcome: "RESOLVED" \| "DISMISSED" }` | forbidden, not_found, invalid_status |
| `updatePlanAction(planId, prev, formData)` | plan fields in §2.21, as form strings; the schema converts ringgit to sen, MB to bytes (`BigInt`), blank to `null` | forbidden, not_found, validation, free_required |
| `saveTemplateAction(templateId \| null, prev, formData)` | `{ code?, nameMs, nameEn, layout, font, primary, background, accent, active, sortOrder }`; `code` only on create; Prisma `P2002` on `code` becomes `code_taken` | forbidden, not_found, validation, code_taken, last_active_template |

Guest side, `submitReportAction(locale, slug, formData)` in `src/server/reports/actions.ts`, bound to the locale and slug and used as a plain `<form action>` (no client component):

- Rate limit first: `limiters.report` (5 per 10 minutes) keyed by `clientIpHash()`.
- Input: `{ reason: ReportReason, details?: string }` (trimmed, empty becomes `null`, max 1000).
- Looks up the event with `findGuestEvent(slug)`; none: `notFound()`.
- Result: redirects (with the locale) to `/{slug}/report?sent=1`, or `/{slug}/report?error=validation|rate_limited`; the page renders the thank-you or the error from the query string.

Realtime: `BusMessage` gains `{ type: "closed" }`. `toGuestMessage` passes it through, and `sseResponse` closes the stream after sending it. Host streams (`/api/events/[id]/stream`, slideshow) drop it in their transform, so they stay open.

Read functions (server components call them directly): `adminOverview()`, `listAdminEvents({ q, status, plan, page })`, `getAdminEvent(id)`, `listAdminUsers({ q, page })`, `listReports({ status, page })`, `listPlans()`, `listAllTemplates()`, `listAudit({ page })`. Each page calls `requireAdmin` itself; the layout check is not relied on alone. Pages select only the fields they show (no `pinHash`, `deviceTokenHash`, session data).

Changed contracts (existing code):

- `canAccessAdmin(user, adminEmails)` replaces `canAccessAdmin(user)`; callers: `requireAdmin`, `getEventForMember`.
- `canModerate`, `canManageMembers`, `canDeleteEvent` drop `ADMIN`; new `canEditEvent(role)`. `tests/unit/moderation/rules.test.ts` and `tests/unit/roles.test.ts` change with the contract.
- `saveCard` template rule, and the card builder's template list includes the card's current template.

## 5. Plans and money

- Prices are integer sen; the form takes ringgit and converts with the existing `parseRinggit`; display uses `formatSen`. No client-sent price is trusted anywhere: the form is admin input, validated on the server.
- Limits stay enforced on the server by `checkUploadAllowed` and the e-card plan check; the admin panel only changes the `Plan` and `Event.planId` rows those checks read.
- A manual plan change is not a payment. No `Payment` row is created. When phase 6 lands, paid activation goes through the verified webhook; the admin override stays as an audited exception.
- The Free plan stays active at RM 0.
- Tests: plan change at the quota boundary (Free at 100 uploads to Premium allows the next upload; Premium with 150 uploads to Free refuses it with `limit_reached`); ringgit-to-sen conversion of `40`, `40.50`, `0`; rejection of negative, non-numeric and over-maximum prices; MB-to-bytes conversion; blank to `null`.

## 6. Privacy

- New guest data: `AbuseReport.details` (free text a reporter chooses to write) and the reason. No name, email, phone, IP or device token is stored with a report. Rate limiting uses the existing salted IP hash, in memory only.
- Who sees it: admins only. Hosts do not see reports about their event.
- Retention: reports are deleted with the event (cascade), whether the host or an admin deletes it. Phase 8's purge job must also delete an event's reports when it archives the event; that requirement is added to the phase 8 notes in `docs/HANDOFF.md`.
- Admins can view guest media on host dashboards (needed to judge a report) but cannot export it; exports stay with the host and co-hosts.
- Audit log: stores ids, slugs, plan codes, template codes and changed plan or template fields. It never stores guest names, wishes, RSVP data or report details. It is kept indefinitely as the operator's record; the slug may contain the hosts' names, which is accepted as the minimum needed to identify a deleted event.
- Suspension: see §2.11 for the exact windows (media URLs up to 1 hour, upload URLs up to 15 minutes but never confirmed).
- Nothing new is written to server logs.

## 7. Guest experience

- Guest pages gain one plain `<Link>` each (event page, gallery, card). The report page is a server component with a `<form action={serverAction}>` and no `"use client"` code. Expected first-load JS change on guest routes: about 0 KB; checked in the build output against the 150 KB budget (currently about 126 KB).
- The guest live gallery handles the stream closing like a dropped connection; its reconnect gets 404 and it stops (existing `EventSource` behaviour on a non-200 response). No new guest code.
- The form works with JavaScript off and in in-app browsers; radios and the textarea have labels; tap targets at least 44 px.
- New strings in both `ms.json` and `en.json`: a `report` namespace (link text, page title, intro, seven reasons, details label, submit, thank-you, errors) and the `admin` namespace (nav, page titles, table headings, actions, confirmations, errors, notes) plus the host's suspended banner. Estimated 100 keys per language. The existing keys-match test covers them.

## 8. Env and services

No new env variables, no new services, no new dependencies. `ADMIN_EMAILS` changes meaning slightly: it now also revokes (documented in `.env.example`).

## 9. Alternatives considered

- **Boolean `suspended` flag instead of an enum value.** Every guest path would need a second check. The enum value is hidden by the existing `ACTIVE`-only filter in `findGuestEvent` with no guest-route changes.
- **Admin API routes instead of server actions.** The host side already uses server actions with the same result shape; route handlers would add parsing and fetch code for no gain.
- **Report form as a client component posting to `/api/e/[slug]/report`.** Adds client JS to a guest route; the server-action form needs none.
- **Audit log by Prisma middleware.** Hides the write and cannot record intent (old and new plan); explicit writes in the same transaction are clearer and testable.
- **Auditing admin actions on host dashboards instead of making them read-only.** Touches every host action and still lets staff export guest media; read-only is smaller and safer.

## 10. Rollout

After merging: `npx prisma migrate dev` (applies `admin_panel`). No seed change, no env change. Sign in as `admin@majlisku.test` (in the default `ADMIN_EMAILS`) to use `/admin`.

Docs updated in the same branch: `CLAUDE.md` and `AGENTS.md` (status: phase 7 done; layout: the real paths are `[locale]/dashboard` and `[locale]/admin`, not route groups), `.env.example` (`ADMIN_EMAILS` also revokes), `docs/HANDOFF.md` (next is phase 8; the purge job deletes reports too).
