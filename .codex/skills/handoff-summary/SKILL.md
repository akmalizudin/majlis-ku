---
name: handoff-summary
description: Use at the end of any AI-assisted implementation task in the Majlis Ku repo to produce the required honest handoff summary: what changed, tests and results, compatibility, risks, and what still needs the developer.
---

# Handoff Summary

Every AI-assisted task ends with a concise, honest summary. Use this shape.

## Cover

- **Summary.** The behavior change, in plain language, then the technical change. Name the phase.
- **Files changed.** Path and reason for each.
- **Tests.** Added or updated tests, the commands run, and pass, fail, or blocked for each. Include counts from the fresh run.
- **Verification evidence.** Lint, typecheck, unit tests, build (with guest-route JS size when relevant), e2e: which ran, which were skipped, and why.
- **Git status.** Branch or worktree, whether the work is committed, whether it is pushed, PR status, and any approval still needed from the developer.
- **Compatibility and rollout.** What teammates must do after merging: `npm install`, `npx prisma migrate dev`, seed, new env variables. Changes to models, routes, server actions, or i18n keys.
- **Docs and skills.** Which docs and skills were updated, or "none needed".
- **Risks and follow-ups.** Known risks, or "none known".

## Rules

- Be specific. Do not hide failed or skipped validation; say what was skipped and why.
- Say plainly whether commit and push are pending the developer's approval.
- If another developer continues the work, give actionable notes: functions and routes to call, example inputs, error cases, known gaps.
- At the end of a phase, say so, list what the phase delivered against `docs/brief.md`, and wait for the developer's "continue".
