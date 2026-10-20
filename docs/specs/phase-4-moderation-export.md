# Phase 4 Spec: Moderation and Export

Status: approved under the developer's 2026-10-20 instruction to build the whole system locally ("proceed").
Requirement source: `docs/brief.md`, phase 4 (hide/approve, ZIP download, wishes PDF), plus the brief's co-host role and the PDPA rule that a host can delete the whole event.

## 1. Goal and non-goals

**Goal.** Hosts and co-hosts control what guests see, and hosts can take everything home or delete it.

**Non-goals.** Abuse reports (phase 7). Automatic retention purge (phase 8).

## 2. Acceptance criteria

1. In the host gallery each item has actions: Approve (when waiting), Hide / Show, and Delete (with a confirmation). "Approve all" approves every waiting item at once. A status filter shows all, waiting, or hidden items.
2. Approving or showing an item sends it to live guest galleries and the slideshow; hiding or deleting removes it from them at once.
3. Deleting an upload deletes its files in storage and gives its slot and bytes back to the plan.
4. "Download everything" streams a ZIP of every original upload (folders `gambar/`, `video/`, `suara/`), a `ucapan.pdf` of all wishes, and `ucapan.csv`. Hidden items are included (they belong to the host); failed and unfinished uploads are not.
5. "Wishes PDF" alone is also downloadable: a cover page with the names and date, then every wish with its guest name and time, in a font that covers Malay, Latin accents, Arabic script and Chinese-free symbols; characters the font cannot draw (emoji) are dropped instead of printing boxes.
6. The owner can invite a co-host by email; the co-host signs in with that email (magic link or Google) and sees the event with moderation rights. The owner can remove a co-host. Co-hosts cannot invite, remove, or delete the event.
7. The owner can delete the whole event after typing its slug to confirm: every upload, wish, RSVP, guest, card and its files in storage are deleted. An event with payment records cannot be deleted from here (payments are kept for accounting); the page says so.
8. Every action checks on the server that the caller is a member with the right role.

## 3. Data model

No schema change. Co-hosts are `EventMember` rows with role `COHOST`; inviting creates the `User` by email if it does not exist yet.

## 4. API contract

| Route or action | Who | Effect |
| --- | --- | --- |
| Server action `moderateItem(eventId, type, id, action)` | owner, co-host, admin | `approve`, `hide`, `show`, `delete` |
| Server action `approveAll(eventId)` | owner, co-host, admin | all waiting items become visible |
| `GET /api/events/[id]/export/media` | owner, co-host, admin | ZIP stream |
| `GET /api/events/[id]/export/wishes` | owner, co-host, admin | PDF |
| Server actions `inviteCohost`, `removeCohost`, `deleteEvent` | owner (and admin) | as above |

## 5. Privacy

Deletion removes files, not only rows. Exports are generated on request and never stored.

## 6. Guest experience

No change to the guest page bundle.

## 7. Env and services

New packages: `archiver` (ZIP streaming) and `dejavu-fonts-ttf` (PDF font), both server-only.

## 8. Rollout

`npm install`. No migration.