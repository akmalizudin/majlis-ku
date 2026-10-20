---
name: majlis-workflow
description: Use when starting any conversation or task in the Majlis Ku repo, before responding, reading files, planning, reviewing, editing, or running commands. This is the mandatory entry skill that routes work through CLAUDE.md, playbook.md, the lifecycle skills, and the repo guard skills.
---

# Majlis Ku Workflow

Start every Majlis Ku task here. Do not read code, answer questions, review diffs, edit files,
or run commands until you have classified the task and chosen the guardrails.

## Read first

1. Read `CLAUDE.md`.
2. Read `playbook.md` for anything beyond a trivial typo, comment, or doc-wording change.
3. Note the current phase from the status table in `CLAUDE.md`, and read its spec and plan in `docs/specs/` and `docs/plans/` if they exist.
4. Run `git status --short` and `git branch --show-current` so you know the state of the checkout.

## Classify the task

Put the prompt into one bucket (the same list as `playbook.md` §4):

- trivial doc, comment, or wording change
- question or clarification
- discovery or code inspection
- requirements, design, or planning
- review
- bug investigation or fix
- implementation or refactor
- handoff or delivery summary

If more than one applies, start with the earliest workflow stage. Only the trivial bucket may
shorten the flow, unless the developer explicitly names a gate to skip.

## Route to the lifecycle skill

For any non-trivial feature, bug, refactor, or implementation, use the skill for the current stage:

| Stage | Skill |
| --- | --- |
| Intake and discovery (read-only) | `change-intake-discovery` |
| Requirements and design spec | `change-design-spec` |
| Test-first plan | `tdd-plan` |
| Workspace, baseline, edit boundary (immediately before edits) | `implementation-gate` |
| Fresh evidence before any "done" claim | `verification-review` |
| What happens to the changes | `completion-checkpoint` |
| End-of-task summary | `handoff-summary` |

## Invoke the guards

- `data-contract-guard`: Prisma schema or migration, route handler, server action, Zod schema, env variable, or `.mcp.json`.
- `privacy-pdpa-guard`: anything that stores, shows, exports, or deletes guest data or media.
- `payments-guard`: prices, plans, limits, checkout, `PaymentProvider`, webhooks, receipts, refunds.
- `guest-experience-guard`: any page or component a guest sees.
- `doc-drift`: any change to layout, rules, contracts, env variables, status, or process.

## Phase discipline

- Work on one phase at a time, in the order of `docs/brief.md`.
- At the end of a phase: run the app, run the tests, summarise what was built, and wait for the developer's "continue".
- Ask the developer before adding a paid service or changing the stack.

## Commit and push gate

- Do not commit unless the developer asked for it or approved it.
- Do not push unless the developer asked for it or approved it.
- Before asking, report changed files, validation results, skipped checks, known risks, and the proposed commit message.
- If a git command fails inside an agent sandbox (lock file, permission error, network), retry that command once outside the sandbox. Never delete lock files or edit git config to work around it.

## Hard rules

- Do not skip discovery, design, TDD planning, or verification for non-trivial work.
- Do not edit before the active gate allows edits.
- Keep facts in `CLAUDE.md` and `playbook.md`; do not copy them into skills.

## Red flags: you are about to skip this entry point

| Thought | Reality |
| --- | --- |
| "This is just a question." | Questions about the code still need the right context and guard. |
| "I already know this repo." | Several people change it in parallel. Check the current state. |
| "It is small, gates are overkill." | Classify first. Only the trivial bucket may shorten the flow. |
| "The event is soon, skip the process." | Time pressure is not permission. Ask which gate the developer wants shortened. |
