# Phase 3 Spec: Media+

Status: approved under the developer's 2026-10-20 instruction to build the whole system locally ("proceed").
Requirement source: `docs/brief.md`, phase 3: video, voice recording in the browser (MediaRecorder), thumbnails, realtime updates, slideshow.

## 1. Goal and non-goals

**Goal.** Guests can send videos and voice messages; the host's gallery and a venue slideshow update live as uploads arrive.

**Non-goals.** Moderation actions and exports (phase 4). Cloud storage and multi-instance realtime (later, with hosting).

## 2. Acceptance criteria

1. Guests see Video only when the event's plan allows video (Premium); otherwise the button says it is not in the plan. Voice is available on every plan that includes the gallery.
2. Video: the guest picks or records a video; the browser reads its length first and refuses one longer than the plan's limit (60 s on Premium) before uploading. Per-file cap 200 MB (and the plan's cap).
3. Voice: the guest records in the browser with MediaRecorder (format picked from what the browser supports), sees a timer, can listen back, re-record, or send. Recording stops by itself at 3 minutes. When MediaRecorder or the microphone is unavailable, an audio file picker is offered instead.
4. The server checks magic bytes, then processes in the background: video gets a duration check (refused if over the plan limit by more than 1 s), a poster frame and thumbnail, and an H.264/AAC MP4 copy with fast start; voice gets an AAC `.m4a` copy and its duration. Status goes `PROCESSING` then `READY` (or `FAILED`, with the files deleted and the counters given back).
5. Uploads still `PROCESSING` when the server restarts are picked up again at start-up.
6. The host gallery shows new items live (no reload) through Server-Sent Events; the public guest gallery does the same with visible items only.
7. `/slideshow/[eventId]` (hosts only) is a full-screen, auto-rotating display of photos, videos (muted) and wishes, with the guest's name, a QR corner, and new uploads shown next as they arrive. It refreshes its signed URLs every 20 minutes and reconnects the live stream if it drops.
8. Items waiting for approval or hidden never reach a guest stream or the slideshow.

## 3. Data model

No schema change. `Upload.displayKey` holds `display.mp4` (video) or `display.m4a` (voice); `thumbKey` holds `thumb.webp` (video poster thumbnail).

## 4. API contract

| Route | Who | Output |
| --- | --- | --- |
| `GET /api/events/[id]/stream` | owner, co-host, admin | SSE: `item` events (all moderation states), `ping` every 25 s |
| `GET /api/e/[slug]/stream` | guest, when the gallery is public and the PIN (if any) entered | SSE: `item` events, visible only |
| `GET /api/events/[id]/slideshow` | owner, co-host, admin | `{ items }` visible photos, videos and wishes, newest 200, with fresh signed URLs |

`item` payload: the same `GalleryItem` shape the gallery pages render.

## 5. Plans and money

`checkUploadAllowed` already covers video permission and length; the server re-checks the real length after processing.

## 6. Privacy

Video and voice originals stay private to hosts; guests and the slideshow get only the processed copies. Microphone access is asked only when the guest presses Record.

## 7. Guest experience

Recording and video code is loaded only when the guest opens Video or Voice (`next/dynamic`), keeping the first load under 150 KB. New strings in both languages.

## 8. Env and services

New package `ffmpeg-static` (bundled ffmpeg binary, server-only, listed in `serverExternalPackages`). Processing runs in the Next.js server process; one job at a time per kind to keep the machine responsive.

## 9. Alternatives considered

- WebSockets: two-way is not needed; SSE is simpler and works through proxies.
- Client-side video compression: too slow and battery-hungry on low-end phones.

## 10. Rollout

`npm install` (downloads the ffmpeg binary; `allowScripts` already lists it). No migration.