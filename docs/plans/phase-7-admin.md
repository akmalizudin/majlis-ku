# Phase 7 TDD Plan: Admin panel

Spec: `docs/specs/phase-7-admin.md` (approved 2026-10-21). Branch: `feat/admin-panel`, worktree `.worktrees/feat/admin-panel`.

Slices run one after the other in this worktree (slices 1 to 3 share `prisma/schema.prisma` and the role helpers; later slices build on them). Each slice is one implementer dispatch followed by one reviewer pass. The orchestrator runs the final evidence.

Unit tests stay pure (no database), as in the rest of `tests/unit/`: every decision is a plain function tested there; database reads and writes are thin and covered by the e2e suite in slice 9.

## Global constraints

- Server owns the truth: plan limits, prices and statuses are read and decided on the server. Prices are integer sen.
- Zod at every boundary: admin forms and the report form are parsed from named `FormData` fields with strict schemas.
- Every `/admin/*` page calls `requireAdmin`; every admin action checks `canAccessAdmin(user, env().ADMIN_EMAILS)` itself.
- Both locales: every new string in `messages/ms.json` and `messages/en.json` (`tests/unit/messages.test.ts` enforces it).
- Guest routes stay under 150 KB first-load JS; the report link and page add no `"use client"` code.
- Editor quirk (`docs/HANDOFF.md`): after writing any file under a `[bracket]` folder, run `grep -rnE '^commit [0-9a-f]{40}' src tests` and remove any pasted git log text.
- Must not change: `prisma/migrations/20261020102721_init/`, the guest upload flow (`src/components/guest/`, `src/server/uploads/`), `src/server/plans/limits.ts` logic, payments, specs and plans of earlier phases.

## Slice 1: schema and migration

- Files: `prisma/schema.prisma`; new `prisma/migrations/<ts>_admin_panel/migration.sql` (generated).
- Change: `EventStatus.SUSPENDED`, `Event.suspendedAt`, `Event.reports`, enums `ReportReason`, `ReportStatus`, `AuditAction`, models `AbuseReport`, `AuditLog`, and the `User` back-relations `reportsHandled`, `auditEntries`, exactly as in spec §3.
- Red: none possible in unit tests (no database); the check is the migration itself.
- Green: `npx prisma migrate dev --name admin_panel`.
- Validate: `npx prisma validate`; `npx prisma migrate dev` applies cleanly on the existing local database and on a fresh one (`npx prisma migrate reset --force` against a throwaway database only, never the shared one without asking); `npx prisma db seed`; `npm run typecheck`; `npm test` (still 137 green).
- Review checkpoint: `onDelete` on every new relation; no required column without a default.

## Slice 2: admin access and read-only admins on host dashboards

- Files: `src/server/auth/roles.ts`, `src/server/auth/session.ts`, `src/server/events/service.ts` (`getEventForMember`), `src/server/moderation/rules.ts`, `src/server/events/actions.ts`, `src/app/api/events/[id]/cover/route.ts`, `src/app/api/events/[id]/export/media/route.ts`, `src/app/api/events/[id]/export/wishes/route.ts`, `src/app/api/events/[id]/rsvp/export/route.ts`; tests `tests/unit/roles.test.ts`, `tests/unit/moderation/rules.test.ts`.
- Interfaces: `canAccessAdmin(user: { role: UserRole; email?: string | null } | null | undefined, adminEmails: readonly string[]): boolean`; `canEditEvent(role: MemberRole): boolean` (owner or co-host); `canModerate`, `canManageMembers`, `canDeleteEvent` return false for `"ADMIN"`.
- Red, `tests/unit/roles.test.ts`:
  - `canAccessAdmin` "requires the ADMIN role and an email still in ADMIN_EMAILS": `canAccessAdmin({ role: "ADMIN", email: "gone@example.com" }, ["admin@example.com"])` is `false`; `canAccessAdmin({ role: "ADMIN", email: " Admin@Example.com " }, ["admin@example.com"])` is `true`; `canAccessAdmin({ role: "HOST", email: "admin@example.com" }, ["admin@example.com"])` is `false`.
  - Command: `npx vitest run tests/unit/roles.test.ts`. Expected red: the first assertion gets `true` (the list is ignored today).
- Red, `tests/unit/moderation/rules.test.ts`:
  - "admins are read-only on host dashboards": `canModerate("ADMIN")`, `canManageMembers("ADMIN")`, `canDeleteEvent("ADMIN")`, `canEditEvent("ADMIN")` are all `false`; `canEditEvent("OWNER")` and `canEditEvent("COHOST")` are `true`.
  - The existing "lets owners, co-hosts and admins moderate" and "...owners and admins manage members..." tests change to match the approved contract (spec §4, "Changed contracts").
  - Command: `npx vitest run tests/unit/moderation/rules.test.ts`. Expected red: `canEditEvent` is not exported, and `canModerate("ADMIN")` is `true`.
- Green: the role functions; `requireAdmin` and `getEventForMember` pass `env().ADMIN_EMAILS`; `updateEventAction` and `updateSettingsAction` refuse unless `canEditEvent(event.memberRole)`; the cover and three export routes throw `ApiError("forbidden", 403)` unless `canEditEvent`. Card routes already go through `canModerate` (`requireCardEditor`, `saveCardAction`).
- Validate: `npm test`, `npm run typecheck`, `npm run lint`.

## Slice 3: admin rules and schemas (pure)

- Files: new `src/server/admin/rules.ts`, `src/lib/schemas/admin.ts`, `src/lib/schemas/report.ts`; tests `tests/unit/admin/rules.test.ts`, `tests/unit/schemas/admin.test.ts`, `tests/unit/schemas/report.test.ts`.
- Interfaces (`src/server/admin/rules.ts`):
  - `nextEventStatus(status: EventStatus, action: "suspend" | "unsuspend"): EventStatus | null`
  - `planChange(event: { status: EventStatus; startsAt: Date; planId: string }, plan: { id: string; active: boolean; retentionDays: number } | null, now: Date): { ok: true; data: { planId: string; planActivatedAt: Date; purgeAt: Date } } | { ok: false; error: "invalid_status" | "invalid_plan" | "same_plan" }`
  - `nextReportStatus(status: ReportStatus, outcome: "RESOLVED" | "DISMISSED"): ReportStatus | null`
  - `checkPlanUpdate(code: PlanCode, input: PlanFormOutput): "free_required" | null`
  - `planAuditDiff(before: PlanEditable, after: PlanEditable): Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }>` (bytes as MB numbers; only changed fields)
  - `canDeactivateTemplate(activeCount: number, currentlyActive: boolean, nextActive: boolean): boolean`
- Interfaces (`src/lib/schemas/admin.ts`): `formFields(formData: FormData, names: readonly string[]): Record<string, string>`; `planFormSchema` (ringgit to sen via `parseRinggit` with a `RangeError` caught as a Zod issue, MB to `BigInt` bytes, blank to `null`, ranges from spec §2.21); `templateFormSchema` (and `templateCreateSchema` adding `code`); `changePlanSchema`, `reportOutcomeSchema`, `confirmSlugSchema`. All `.strict()`.
- Interface (`src/lib/schemas/report.ts`): `reportSchema` (`reason` enum, `details` trimmed, empty to `null`, max 1000).
- Red, `tests/unit/admin/rules.test.ts`:
  - "suspends only active events and unsuspends only suspended ones" (`nextEventStatus("ACTIVE","suspend") === "SUSPENDED"`, `("DRAFT","suspend") === null`, `("SUSPENDED","unsuspend") === "ACTIVE"`, `("ACTIVE","unsuspend") === null`).
  - "changes plan for active and suspended events and recomputes purgeAt" (Free to Premium: `purgeAt = max(startsAt, now) + 365 days`), "refuses archived or draft events", "refuses an inactive, unknown or same plan".
  - "handles a report only while open".
  - "keeps the Free plan active at RM 0" (`checkPlanUpdate("FREE", {...active:false})` and price 100 give `free_required`; ECARD inactive is fine).
  - "lists only changed plan fields, bytes as MB" (`maxUploadBytes` 15 MB to 20 MB gives `{ maxUploadMb: { from: 15, to: 20 } }`).
  - "never deactivates the last active template".
  - Command: `npx vitest run tests/unit/admin/rules.test.ts`. Expected red: cannot resolve `@/server/admin/rules`.
- Red, `tests/unit/schemas/admin.test.ts`: "parses ringgit to sen" (`"40"` to 4000, `"40.50"` to 4050, `"0"` to 0); "rejects negative, non-numeric and over RM 10,000 prices as validation issues, never a thrown RangeError"; "turns blank upload limit and storage into null"; "converts MB to bytes as BigInt"; "max video seconds blank is null, 0 and 601 are rejected"; "caps max upload at 200 MB"; "rejects unknown fields"; "template codes are 3 to 40 lowercase letters, digits and hyphens"; "colours must be #rrggbb"; "`formFields` ignores `$ACTION_` keys". Expected red: module not found.
- Red, `tests/unit/schemas/report.test.ts`: "accepts a reason with optional details"; "rejects an unknown reason"; "trims details and turns empty into null"; "rejects details over 1000 characters". Expected red: module not found.
- Green: the three modules.
- Validate: `npm test`, `npm run typecheck`.

## Slice 4: template rule, plan-change limits, realtime close, report limiter

- Files: `src/server/ecard/templates.ts`, `src/server/ecard/service.ts` (`saveCard`), `src/app/[locale]/dashboard/events/[eventId]/card/page.tsx` (template list includes the card's current template), `src/server/realtime/bus.ts`, `src/server/realtime/sse.ts`, `src/app/api/events/[id]/stream/route.ts`, `src/server/security/rate-limit.ts`; tests `tests/unit/ecard/templates.test.ts` (new), `tests/unit/plans/limits.test.ts`, `tests/unit/realtime/bus.test.ts`.
- Interfaces: `templateUsable(template: { id: string; active: boolean } | null, currentTemplateId: string | null): boolean`; `BusMessage` adds `{ type: "closed" }`; `toHostMessage(message): BusMessage | null` drops `closed`; `sseResponse` sends then closes on `closed`; `limiters.report` (5 per 10 minutes).
- Red, `tests/unit/ecard/templates.test.ts`: "allows an active template", "allows the card's current template even when inactive", "refuses another inactive or unknown template". Expected red: `templateUsable` is not exported.
- Red, `tests/unit/realtime/bus.test.ts`: "passes closed to guests" (`toGuestMessage({ type: "closed" })` deep-equals it); "drops closed for hosts" (`toHostMessage` returns `null`). Expected red: type error and `toHostMessage` not exported.
- Characterization (green from the start, pinning spec §2.9 against the existing `checkUploadAllowed`), `tests/unit/plans/limits.test.ts`: "a Premium event with 150 uploads moved to Free gets limit_reached"; "a Free event at 100 uploads moved to Premium accepts the next upload".
- Green: `templateUsable` used by `saveCard`; the card page passes `templates` plus the current one if inactive; bus and SSE changes; the host stream route passes `toHostMessage`; the limiter.
- Validate: `npm test`, `npm run typecheck`, `npm run lint`.

## Slice 5: admin domain service and actions

- Files: new `src/server/admin/service.ts` (reads), `src/server/admin/mutations.ts` (writes with the audit row in one `db.$transaction`), `src/server/admin/audit.ts` (`writeAudit(tx, actorId, action, targetType, targetId, details)`), `src/server/admin/access.ts` (`requireAdminAction(): Promise<User | null>`), `src/server/admin/actions.ts` (the seven actions in spec §4 with `AdminResult`); `src/server/reports/service.ts` (`createReport`), `src/server/reports/actions.ts` (`submitReportAction(locale, slug, formData)`).
- Behaviour: mutations call the slice 3 rules; suspend publishes `{ type: "closed" }` after the transaction commits; delete calls `deleteEventCompletely`, writes the audit row after success, then redirects; `saveTemplateAction` maps Prisma `P2002` to `code_taken` and runs the last-active check inside the transaction; reads select only shown fields.
- Red: no unit test (database code; the decisions are already tested in slice 3). Covered by slice 9 e2e.
- Validate: `npm run typecheck`, `npm run lint`, `npm test`.
- Review checkpoint (final reviewer, because it touches authorization and deletion): every action checks admin first, ids come from arguments and are loaded server-side, no BigInt in audit `details`, no guest data in audit `details`.

## Slice 6: admin UI

- Files: new `src/app/[locale]/admin/layout.tsx`, rewrite `src/app/[locale]/admin/page.tsx` (overview); new `src/app/[locale]/admin/{events,events/[id],users,reports,plans,templates,audit}/page.tsx`; new `src/components/admin/` (nav, pager, plan form, template form, event actions, report actions) and `src/components/admin/labels.ts` (server-only `*Labels`, same pattern as `src/components/host/labels.ts`); `messages/ms.json`, `messages/en.json` (`admin` namespace).
- Red: `tests/unit/messages.test.ts` goes red if a key exists in one language only; no other unit test (pages).
- Validate: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`; a 360 px look at `/admin` and `/admin/events/[id]` through Playwright MCP.

## Slice 7: guest report page and links

- Files: new `src/app/[locale]/[slug]/report/page.tsx`; edit `src/app/[locale]/[slug]/page.tsx`, `src/app/[locale]/[slug]/gallery/page.tsx`, `src/app/[locale]/i/[slug]/page.tsx` (footer link); `messages/*.json` (`report` namespace).
- Red: none in unit tests (schema tested in slice 3); covered by slice 9 e2e.
- Validate: `npm run build` and report the first-load JS of `/[locale]/[slug]`, `/[locale]/[slug]/report`, `/[locale]/i/[slug]` (each under 150 KB, change from about 126 KB near 0); a 360 px check in both languages; the form posts with JavaScript disabled (Playwright `javaScriptEnabled: false` in slice 9).

## Slice 8: host-side changes

- Files: `src/app/[locale]/dashboard/events/[eventId]/layout.tsx` (suspended banner), `src/app/[locale]/dashboard/events/[eventId]/page.tsx` (upload limit 0 shows "0": `limit !== null`), host UI that shows mutate buttons hides them for `memberRole === "ADMIN"` (the server refusal from slice 2 is the real guard); `messages/*.json`.
- Validate: `npm test`, `npm run typecheck`, `npm run lint`.

## Slice 9: e2e

- New `tests/e2e/admin.spec.ts`, helper `createEventAs(page, email)` in `tests/e2e/helpers.ts` if the existing specs do not already share one. Each test makes its own host and event; plan edits are restored at the end of the test (the e2e database is shared).
  1. "a host cannot open admin pages or call admin actions": `/admin/events`, `/admin/plans` show "Akses ditolak".
  2. "admin changes an event's plan": Free to Premium on a fresh event; the host overview shows Premium; the audit log shows `EVENT_PLAN_CHANGED`.
  3. "guest reports, admin suspends and unsuspends": with JavaScript disabled, a guest reports the event (reason Scam, details); the thank-you shows; the admin sees it under open reports; suspends; the guest page and `/i/{slug}` return 404; the host sees the banner; unsuspend; the guest page is back; resolve the report; the audit log has all three entries.
  4. "suspending closes a guest live stream": a public-gallery event; a guest page opens an `EventSource` on `/api/e/{slug}/stream`; the admin suspends; `readyState` becomes `CLOSED` within 10 s.
  5. "admin is read-only on a host dashboard": the admin opens the host's event; `GET /api/events/{id}/export/media` and `/export/wishes` return 403; the delete event form is not shown.
  6. "plan edits are validated and audited": deactivating Free shows the error; ECARD price RM 45 saves and shows "RM 45.00"; restored to RM 40.
  7. "templates": create `e2e-<timestamp>`, deactivate it, it is gone from the host's card builder. The last-active rule is unit-tested only, because the seed has three active templates.
  8. "admin deletes an event": wrong slug shows the error; the right slug deletes it and the guest page returns 404.
- Validate: `npm run build`, stop old `next start` processes, `npm run test:e2e` (existing 12 plus these).

## Slice 10: docs

- `CLAUDE.md` and `AGENTS.md`: status (phase 7 done), layout (`[locale]/dashboard`, `[locale]/admin`, `src/server/admin`, `src/server/reports`), the admin-access rule; `.env.example` (`ADMIN_EMAILS` also revokes); `docs/HANDOFF.md` (next is phase 8; the purge job deletes reports too; admin is read-only on host dashboards). Run the `doc-drift` skill.

## Validation (Gate 6, run by the orchestrator)

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (guest routes under 150 KB), `npx prisma migrate dev` on a fresh database plus `npx prisma db seed`, `npm run test:e2e`, `node scripts/skills.mjs check`. Then a whole-branch review by the final reviewer (authorization and deletion).
