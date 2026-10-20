---
name: change-intake-discovery
description: Use when starting a non-trivial Majlis Ku change and the current behavior, owning module, contracts, or risks are not yet established. Read-only discovery before any spec, plan, or edit.
---

# Change Intake and Discovery

Establish facts before proposing anything. This skill is read-only: no edits, no branches, no files.

## Required inputs

- `CLAUDE.md` and `playbook.md`.
- `docs/brief.md`: the requirement behind the request, and which phase it belongs to.
- The current phase's spec and plan, if any.
- `prisma/schema.prisma` and the `src/server/<domain>/` modules involved.
- The routes in `src/app/` the request could touch.

## Establish

1. **Request, restated.** One or two sentences in your own words, with the phase it belongs to.
2. **Owner.** Which domain module owns this (`events`, `uploads`, `wishes`, `rsvp`, `plans`, `payments`, `media`, `auth`, `admin`). Shared helpers belong in `src/lib/`. If it fits none, say so.
3. **Current behavior.** What the code does today, with `path:line` references. Run read-only commands when that helps.
4. **Contracts touched.** Prisma models and fields, route handlers and server actions (input, output, errors), Zod schemas, env variables, i18n keys, storage object keys.
5. **Who is affected.** Guest, host, co-host, admin. What each can see or change after the change.
6. **Risks.** Guest data and PDPA, money and plan limits, cross-event access, guest-page weight, in-app browser support, migrations on existing data.
7. **Open questions.** Only those the developer can resolve. Ask them one at a time with the question tool.

## Exit condition

Report the findings in chat as a short discovery note (owner, current behavior, contracts,
risks, open questions) and wait for the developer's go-ahead. Then continue with
`change-design-spec`, or `implementation-gate` if the developer says the change is small
enough to skip the spec and plan.

## Common mistakes

- Proposing a solution before the owner is known.
- Reading only the route handler and missing the domain function or the schema.
- Forgetting the guest side of a host feature (or the reverse).
- Treating an assumption as a finding. Mark assumptions as assumptions.
