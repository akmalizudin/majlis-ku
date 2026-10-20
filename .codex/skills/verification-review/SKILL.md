---
name: verification-review
description: Use when Majlis Ku implementation or a test-only slice is complete and the change may be claimed fixed, complete, or ready for review. Produces fresh evidence before any completion claim.
---

# Verification and Review

Produce fresh evidence that the change matches the approved artifacts and adds no contract,
privacy, money, or guest-experience regressions. Evidence from earlier in the session does not
count; run the commands again.

## Required checks

1. Compare the diff with the approved spec and plan. Note any difference.
2. Run, from the repo root, and read the output:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   node scripts/skills.mjs check
   ```
3. Schema change: `npx prisma migrate dev` applies cleanly and `npx prisma db seed` runs.
4. Guest-facing change: read the first-load JS for the guest routes in the `npm run build` output (budget 150 KB), and check the page on a 360 px wide viewport with the Playwright MCP or an e2e test. Check both `ms` and `en`.
5. Upload, gallery, or payment flow change: `npm run test:e2e` for that flow.
6. Review the diff for: client-trusted prices or limits, missing Zod validation, cross-event access, media served without signed URLs, unverified or non-idempotent webhooks, hard-coded strings, missing tests (happy path, error, boundary), stale docs or `.env.example`.

## Required output

- Each command run and its fresh result (pass, fail, counts).
- Tests added or updated.
- Findings by severity with `path:line`, or an explicit "no findings".
- Fixes made, residual risks, and anything skipped with the reason.
- Whether the change is ready for human review.

If any check fails or cannot run, say so plainly and stop short of a completion claim.

## Common mistakes

- Reporting "tests pass" from a run before the last edit.
- Skipping `npm run build`; type errors and bundle size only show there.
- Checking the guest page only on a desktop viewport, or only in one language.
