# Phase 3 TDD Plan: Media+

Spec: `docs/specs/phase-3-media-plus.md`. Branch: `feat/media-plus`.

Scope boundary: no schema change, no moderation actions, no export.

## Slice 1: ffmpeg wrapper

- Red: `tests/unit/media/ffmpeg.test.ts`: `parseDuration` reads "Duration: 00:01:02.50" as 62.5; `probeDuration` on a generated 2 s test video returns about 2; `makeVideoCopies` produces an MP4 that starts with an `ftyp` box and a poster JPEG; `makeVoiceCopy` turns a generated Opus WebM into an `.m4a`.
- Green: `src/server/media/ffmpeg.ts`.

## Slice 2: processing jobs

- Red: `tests/unit/media/job-queue.test.ts`: the queue runs jobs one at a time per lane and keeps going after a failure.
- Green: `src/server/media/job-queue.ts`, `src/server/uploads/processing.ts` (`processVideo`, `processVoice`, `resumeProcessing`), `src/instrumentation.ts`.

## Slice 3: realtime

- Red: `tests/unit/realtime/bus.test.ts`: subscribers of one event get its items and not another event's; unsubscribe stops delivery; `toGuestItem` drops hidden and pending items and the original link.
- Green: `src/server/realtime/bus.ts`, SSE routes, `src/components/gallery/live-items.tsx`.

## Slice 4: guest video and voice UI

- `src/components/guest/video-picker.tsx`, `voice-recorder.tsx` (loaded with `next/dynamic`), `features` from the plan.
- Red: `tests/unit/guests/recorder-mime.test.ts`: `pickRecorderMime` prefers `audio/webm;codecs=opus`, then `audio/mp4`, and returns null when nothing is supported.

## Slice 5: slideshow

- `src/app/[locale]/slideshow/[eventId]/page.tsx`, `src/components/slideshow/slideshow.tsx`, `GET /api/events/[id]/slideshow`.
- Red: `tests/unit/slideshow/order.test.ts`: `nextSlide` shows queued new items first, then cycles the rest.

## Slice 6: e2e

- `tests/e2e/media.spec.ts`: on the Premium demo event a guest uploads a short video and a voice file; both reach `READY` and show in the host gallery; the host gallery receives a new photo live without reload; the slideshow page renders and shows an item.

## Validation

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (guest route < 150 KB), `npm run test:e2e`, `node scripts/skills.mjs check`.