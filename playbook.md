# Majlis Ku AI-First TDD Playbook

Owner: Izzham Burhan, TMRND. Applies to every change in this repo, by a human or an AI agent.
The root handbook is `CLAUDE.md` (Claude Code) or `AGENTS.md` (Codex and others). This
playbook is the process; the handbook is the facts (stack, layout, rules, commands).

## 1. Purpose

Several people and several agents build one product in one repo, in parallel, phase by phase.
The process exists so that:

- the data model, API contracts, and plan limits stay consistent for everyone;
- money and guest data are handled correctly the first time, because mistakes there are expensive;
- AI-written code is test-first, verified with fresh evidence, and reviewed by a person;
- guest pages stay fast and usable on cheap phones and in in-app browsers.

## 2. Core principle

Write the test first, make the smallest change that passes, then prove it with fresh
command output. No claim of "done" without evidence from this session.

## 3. The gates

Every non-trivial change passes these gates in order. Each gate has a skill.

| Gate | What happens | Skill |
| --- | --- | --- |
| 0. Route | Classify the task, pick guards | `majlis-workflow` |
| 1. Discovery | Read-only: owner module, current behavior, contracts, risks | `change-intake-discovery` |
| 1.5. Workspace | Worktree under `.worktrees/` (default) or a plain branch | `implementation-gate` (setup part) |
| 2. Design spec | Requirements, acceptance criteria, data model, API contract, plan-limit impact. Developer approves | `change-design-spec` |
| 3. TDD plan | Test-first slices with exact failing tests and commands. Developer approves | `tdd-plan` |
| 4. Implementation gate | Workspace clean, baseline green, edit boundary declared | `implementation-gate` |
| 5. Implementation | Red, green, refactor, one slice at a time | guards below |
| 6. Verification | Fresh lint, typecheck, unit tests, build, e2e where relevant | `verification-review` |
| 6.5. Completion | Developer picks: commit, push, PR, or leave | `completion-checkpoint` |
| 7. Handoff | Honest end-of-task summary | `handoff-summary` |

Guards, used whenever their trigger applies:

- `data-contract-guard`: Prisma schema or migration, route handler, server action, Zod schema, env variable, or `.mcp.json`.
- `privacy-pdpa-guard`: anything that stores, shows, exports, or deletes guest data or media.
- `payments-guard`: prices, plans, limits, checkout, `PaymentProvider`, webhooks, receipts, refunds.
- `guest-experience-guard`: any page or component a guest sees.
- `doc-drift`: any change that alters layout, rules, contracts, env variables, status, or this process.

### Phases

The product is built in the eight phases in `docs/brief.md`. A phase is a large change: it gets
its own spec and plan, and may be split into several branches and pull requests. At the end of
each phase, run the app, run the tests, summarise what was built, and wait for the developer's
"continue" before starting the next phase.

### Red flags: you are about to violate a gate

| Thought | Reality |
| --- | --- |
| "It is small, I will just edit." | Only a typo, comment or doc-wording change may skip gates. Everything else is classified first. |
| "I know this code already." | Re-read it in this session. Several people change it in parallel. |
| "The tests will pass, I will skip the run." | Claims need fresh output from this session. |
| "I will fix the test to match my change." | Changing a test to go green hides a regression. Change a test only when the approved contract changed. |
| "The client already knows the price, I will use it." | Never trust client prices or limits. Read them from the database. |
| "I will mark it paid when the redirect comes back." | Only a verified webhook marks a payment paid. |
| "One more chart library on the guest page is fine." | The guest page budget is 150 KB of JS. Measure it. |
| "I will hard-code this label in English for now." | Every string goes into `messages/ms.json` and `messages/en.json`. |

## 4. Task buckets

Classify before acting. If more than one applies, start at the earliest stage.

- trivial doc, comment or wording change (the only bucket that may shorten the flow)
- question or clarification
- discovery or code inspection
- requirements, design or planning
- review
- bug investigation or fix
- implementation or refactor
- handoff or delivery summary

The developer may explicitly shorten a named gate ("skip the design spec, it is a one-line
fix"). Never assume it.

## 5. Context to read before any change

1. `CLAUDE.md` or `AGENTS.md`.
2. This playbook, for anything beyond a trivial change.
3. `docs/brief.md` for the requirement behind the change.
4. The spec and plan of the current phase in `docs/specs/` and `docs/plans/`.
5. `prisma/schema.prisma` and the `src/server/<domain>/` modules the change touches.
6. Existing tests for the area.

## 6. Git and branches

- Base branch: `main`. Work happens on a branch, never directly on `main`.
- Branch names: `feat/<area>-<slug>`, `fix/<area>-<slug>`, `docs/<slug>`, `chore/<slug>`, where `<area>` is one of `guest`, `gallery`, `media`, `ecard`, `rsvp`, `payments`, `admin`, `auth`, `i18n`, `infra`.
- Worktrees: `sh scripts/worktree-add.sh <branch> [--base main]` creates `.worktrees/<branch>`. Several agents can then work in parallel without sharing a checkout. Clean up with `sh scripts/worktree-cleanup.sh`.
- Commits: Conventional Commits with the area as scope, for example `feat(gallery): add photo filter`. Do not commit or push unless the developer asked or approved.
- Pull requests: open on GitHub (`gh pr create` if the GitHub CLI is installed, otherwise the web UI); the body follows `.github/pull_request_template.md`.
- Migrations: one Prisma migration per schema change, created on the branch with `npx prisma migrate dev --name <slug>`. Never edit a migration that is already on `main`; add a new one.
- If a git command fails inside an agent sandbox (lock file, permission, network), retry once outside the sandbox; never delete lock files or edit git config to work around it.
- Spec and plan files live in the branch: `docs/specs/<slug>.md`, `docs/plans/<slug>.md`.

## 7. Minimum validation

Run from the repo root. All must pass before a completion claim.

```bash
npm run lint
npm run typecheck
npm test
npm run build
node scripts/skills.mjs check
```

Plus, when relevant:

| Change | Extra evidence |
| --- | --- |
| Schema change | `npx prisma migrate dev` applies cleanly on a fresh database; `npx prisma db seed` runs |
| Guest-facing page | `npm run build` output shows the route's first-load JS under 150 KB; a check on a 360 px viewport (Playwright MCP or e2e) |
| Upload, gallery, or payment flow | `npm run test:e2e` for that flow passes |
| Webhook or `PaymentProvider` change | Unit tests for a valid signature, an invalid signature, and a duplicate delivery |
| Changed skills | `node scripts/skills.mjs check` |

## 8. Definition of Ready

- The phase and the requirement in `docs/brief.md` are named.
- Acceptance criteria are written and testable.
- The data model change and the API contract (input, output, errors) are stated.
- Plan-limit and pricing impact is known.
- Privacy impact is known: what guest data is stored, who sees it, when it is deleted.
- Guest-page impact is known: new client JavaScript, new strings in both languages.

## 9. Definition of Done

- Failing test was written first and seen failing.
- Lint, typecheck, unit tests, and build pass, shown with fresh output.
- E2E tests pass for any touched upload, gallery, or payment flow.
- New strings exist in both `ms.json` and `en.json`.
- `.env.example`, `CLAUDE.md` and `AGENTS.md` (status, layout, commands) are current.
- No client-trusted prices or limits; webhooks verified and idempotent.
- No real personal data in seed, fixtures, or screenshots.
- The developer chose the completion option and received the handoff summary.

## 10. Review checklist

- Does the diff match the approved spec and plan?
- Is each new domain function covered by a happy-path, an error, and a boundary test?
- Is every boundary validated with Zod? Are errors returned in the agreed shape?
- Are prices, quotas, and moderation state read from the server, never from the client?
- Can a guest of one event see or change anything in another event? Can a guest see a private gallery?
- Is media served through signed URLs? Is the file type checked by magic bytes?
- Is the guest page still under the JS budget, translated, and usable with large tap targets?
- Are docs and skills in sync with the code?

## 11. Enforcement

- CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, build, and the skill-parity check on every push to `main` and every pull request.
- Skills and role agents exist for Claude Code (`.claude/skills/`, `.claude/agents/`) and Codex (`.codex/skills/`, `.codex/agents/`). Edit the Claude copy, then run `node scripts/skills.mjs sync`. CI fails if the twins differ.
- `CLAUDE.md` and `AGENTS.md` must describe the same project and rules.

## 12. Agent roles and models

The session you start is the **orchestrator**. It runs every gate, asks the developer every
question, writes the spec and the TDD plan, makes every decision, and holds commit and push
approval. Work that needs no such judgment goes to a **role agent** with its own model and effort.

| Role | Claude Code agent | Codex agent | Model (Claude / Codex) | Effort | Used for |
| --- | --- | --- | --- | --- | --- |
| Orchestrator | the session | the session | Opus or Fable / `gpt-6.1-sol` | high | Gates, questions, decisions, spec, plan, dispatching and merging role work |
| Scout | `majlis-scout` | `majlis_scout` | Haiku / `gpt-6-luna` | medium | Read-only discovery, one scout per area, in parallel |
| Implementer | `majlis-implementer` | `majlis_implementer` | Sonnet / `gpt-6-luna` | high | One TDD plan slice, test first, in the named workspace; review fixes |
| Reviewer | `majlis-reviewer` | `majlis_reviewer` | Sonnet / `gpt-6-luna` | high | Per-slice spec and quality review, scoped re-reviews |
| Final reviewer | `majlis-final-reviewer` | `majlis_final_reviewer` | Opus / `gpt-6.1-sol` | high | Spec review before approval; whole-branch review before `verification-review`; anything touching payments, authorization, or guest data deletion |

Where each role works:

| Gate | Scout | Implementer | Reviewer | Final reviewer |
| --- | --- | --- | --- | --- |
| 1 Discovery | Code, routes, models, tests; one per area | | | |
| 2 Design spec | Similar implementations, affected contracts | | | Spec review before approval |
| 3 TDD plan | Confirm named files, tests, and commands exist | | | Plans touching payments, auth, or deletion |
| 5 Implementation | | Each slice (parallel slices in separate worktrees) | Review after each slice | |
| 6 Verification | | | Diff review when no per-slice review ran | Whole-branch review |

Rules:

- **Dispatch through a role agent, never a bare general-purpose one.** A subagent with no role inherits the session's model. `.claude/settings.json` sets `CLAUDE_CODE_SUBAGENT_MODEL=haiku` as the fallback, but name the role every time.
- **Briefs are self-contained.** A role agent sees none of the conversation: give it the task, the workspace path, the spec or plan text, the acceptance criteria, the guard skills that apply, and the report shape you need.
- **Role agents report; they do not decide.** They never ask the developer, approve a gate, commit, or push unless the brief names that exact step. Questions come back to the orchestrator.
- **Parallel implementers need separate worktrees.** Two implementers never edit the same checkout at the same time. Slices that both touch `prisma/schema.prisma` run one after the other.
- **Escalate a stuck role agent, do not swap roles.** After two failed attempts at the same task, dispatch the same role with effort `xhigh`; if that fails, dispatch it on the orchestrator's model.
- **The session runs the final evidence.** Gate 6 commands are run by the orchestrator itself; a role agent's test run informs a review but is never the evidence for a pass claim.
- **Opting out.** A developer on a small machine or a tight budget may tell the orchestrator to do the role work itself; the gates stay the same.