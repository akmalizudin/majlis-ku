---
name: change-design-spec
description: Use when Majlis Ku discovery is done and requirements, acceptance criteria, the data model, the API contract, plan-limit impact, or privacy impact need to be decided and approved before planning.
---

# Requirements and Design Spec

Turn discovery into one reviewable spec. Do not edit production code while writing it.

## Required inputs

- The discovery note from `change-intake-discovery`.
- `AGENTS.md`, `playbook.md` (§8 Definition of Ready), and `docs/brief.md`.

## Spec contents

Write `docs/specs/<slug>.md` in the ticket workspace (for a phase: `docs/specs/phase-<n>-<slug>.md`):

1. **Goal and non-goals.**
2. **Acceptance criteria.** Numbered, each one testable. Include error and boundary cases (quota reached, wrong file type, expired link, duplicate webhook, offline guest).
3. **Data model.** Prisma models and fields added or changed, indexes, cascade rules, and the migration. How existing rows are handled.
4. **API contract.** For each route handler or server action: path or name, who may call it, Zod input, output shape, error codes.
5. **Plans and money.** Which plan limits apply and where they are enforced. Any price, in sen.
6. **Privacy.** Guest data stored, who can see it, how long it is kept, how it is deleted.
7. **Guest experience.** New client JavaScript on guest pages and its size, offline and retry behavior, new strings in Bahasa Melayu and English.
8. **Env and services.** New env variables (added to `.env.example` and `src/lib/env.ts`) and any new external service. A paid service needs the developer's approval.
9. **Alternatives considered** and why the chosen design wins, briefly.
10. **Rollout.** What teammates must do after merging (migrate, seed, new env variable).

## Exit condition

Self-review for placeholders, contradictions, and untestable criteria. Show the spec to the
developer, get explicit approval, and only then continue with `tdd-plan`. Commit the spec
only when the developer approves committing.

## Common mistakes

- Acceptance criteria that cannot fail.
- Enforcing a plan limit only in the UI.
- A schema change with no plan for existing rows.
- Forgetting the English (or the Malay) copy.
