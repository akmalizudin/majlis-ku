---
name: guest-experience-guard
description: Use when a Majlis Ku change touches any page or component a guest sees: the event page, upload flow, gallery, slideshow, e-card, or RSVP. Checks the JS budget, low-end Android and slow 4G, in-app browsers, i18n, and accessibility.
---

# Guest Experience Guard

Guests open the link from a QR code or WhatsApp on whatever phone they have, often on venue
Wi-Fi or patchy 4G. The page must just work.

## Weight and speed

- First-load JS for guest routes stays under 150 KB. Read it from the `npm run build` output and report it.
- Prefer Server Components; mark only interactive leaves `"use client"`. No heavy UI, animation, or date libraries on guest routes.
- Images: compress on the client before upload; show thumbnails in the gallery, lazy-loaded, with fixed aspect ratios.
- Uploads show progress, retry on failure, and resume or re-queue when the network drops. A failed upload never loses the guest's other files.

## Browsers

- Works in WhatsApp, Instagram, Threads, and Facebook in-app browsers, and in Chrome on low-end Android and Safari on iOS.
- Feature-detect `MediaRecorder` and pick a supported mime type; offer a file-picker fallback when recording is not available.
- Do not depend on popups, third-party cookies, or `localStorage` alone; the guest name lives in a first-party cookie with a `localStorage` copy.

## Language and copy

- Bahasa Melayu is the default; English via the toggle. Every string is in `messages/ms.json` and `messages/en.json`.
- Dates and times show in `Asia/Kuala_Lumpur`, formatted for the locale. Money shows as `RM`.

## Accessibility

- Tap targets at least 44 px, text contrast at least 4.5:1, labels on every input, visible focus.
- The upload buttons (Photo, Video, Voice, Wish) have text labels, not only emoji or icons.
- Respect `prefers-reduced-motion` in the slideshow and the e-card.

## Checks

1. Build and read the guest routes' first-load JS.
2. Open the page on a 360 px wide viewport (Playwright MCP or e2e), in both languages.
3. Throttle to slow 4G and confirm the upload flow still completes or retries.

## Common mistakes

- Importing a client library into a shared layout used by guest pages.
- Hard-coding one language "for now".
- Testing only on desktop Chrome with fast Wi-Fi.
