---
name: tdd-plan
description: Use when a Majlis Ku design spec is approved and a feature, bug fix, refactor, or test-only change needs a test-first implementation plan before editing.
---

# TDD Implementation Plan

Convert the approved spec into small, independently testable, test-first slices. Do not edit
production code while writing the plan.

## Required inputs

- The approved spec in `docs/specs/<slug>.md`.
- `AGENTS.md`, `playbook.md` §7 (minimum validation), and the existing tests for the area.

## Plan contents

Write `docs/plans/<slug>.md`. For every slice give:

1. exact files to create, modify, and test;
2. interfaces consumed and produced (function signatures, Zod schemas, Prisma models);
3. the failing test to write first, by file and test name;
4. the command and the expected red result, for example
   `npx vitest run tests/unit/plans/limits.test.ts -t "rejects upload over quota"` failing because `checkUploadAllowed` is not exported;
5. the minimal implementation to turn it green;
6. the refactor after green, if any;
7. validation commands for the slice and a review checkpoint.

Order slices so each leaves the suite green: schema and migration first, then domain logic in
`src/server/<domain>/`, then route handlers and server actions, then UI, then e2e, then docs.
Put an e2e test in the plan whenever the guest upload flow, the gallery, or the payment flow changes.

Include the global constraints: server-side prices and limits, Zod at boundaries, guest-page JS
budget, both locales, and the scope boundary (files that must not change).

## Exit condition

Self-review for spec coverage, placeholders, signature consistency, and unbounded scope. Get
explicit developer approval of the plan, then continue with `implementation-gate`.

## Common mistakes

- Writing "add tests" without naming the test and its expected failure.
- Slices that leave the suite red between steps.
- Planning the implementation before the spec is approved.
- Testing only through the UI when the logic could be a plain unit test.
