---
name: privacy-pdpa-guard
description: Use when a Majlis Ku change stores, shows, exports, or deletes guest data or media (uploads, wishes, voice notes, RSVPs, galleries, slideshow, ZIP or PDF export, retention, consent text, logs, analytics). Keeps the product PDPA-minded and private by default.
---

# Privacy and PDPA Guard

Guests share photos, voices and messages from a family event. Treat all of it as personal data.

## Private by default

- Galleries are private unless the host opts in. A public gallery is still limited to that event.
- Media is served only through short-lived signed URLs, generated after an access check. Object keys are not guessable (random ids, not names or sequence numbers).
- The optional event PIN is stored hashed and checked on the server; rate-limit PIN attempts.
- Hidden or unapproved items never reach guests or the slideshow, including through realtime events.

## Collect the minimum

- A guest gives only a display name. No email, phone number, or login to upload.
- RSVP asks only for what the host needs (name, attending, pax, message); any phone field is optional and labelled.
- No raw IP addresses stored. Rate-limit and abuse keys use a salted hash.
- Strip location (EXIF GPS) from photos before they are shown to others; keep originals private to the host.

## Consent and control

- The upload screen shows the consent text, in both languages, before the first upload.
- The host can delete one item, or the whole event with all its media and records.
- Retention: media is purged after the plan's retention period ends; the purge also deletes objects in storage, not only database rows.
- Exports (ZIP, PDF, CSV) are generated only for the host or co-host, through signed, expiring links.

## Logs and analytics

- Do not log names, messages, RSVP contents, or signed URLs.
- Third-party analytics or trackers on guest pages need the developer's approval.

## Checks

1. Search the diff for new personal fields and confirm each is needed and covered by deletion and retention.
2. Confirm every new media read path goes through an access check and a signed URL.
3. Confirm seed data, fixtures, and screenshots use invented people.

## Common mistakes

- A public bucket "just for thumbnails".
- Deleting the `Upload` row but leaving the object in storage.
- Sending hidden items over the SSE stream and filtering them in the browser.
