# Majlis Ku

A mobile-first platform for Malaysian events: a **QR digital guestbook** (guests scan one QR code and upload photos, videos, voice messages and wishes into a live gallery and venue slideshow, with no app and no account) and an **e-invitation card with RSVP**. Bahasa Melayu first, English second.

Status: collaboration scaffolding is in place; Phase 1 (setup) is specced in [docs/specs/phase-1-setup.md](docs/specs/phase-1-setup.md) and waiting for approval. No app code yet.
Status: Phase 1 (setup: schema, host sign-in, Bahasa Melayu and English, base layout) is done. See the status table in [CLAUDE.md](CLAUDE.md).

## Working on this repo

This repo is built by several people and AI agents in parallel, using one shared process.

| File | What it is |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | Handbook for Claude Code: stack, layout, rules, commands, status |
| [AGENTS.md](AGENTS.md) | The same handbook for Codex, Gemini CLI, Copilot and other agents |
| [playbook.md](playbook.md) | The process: gates 0 to 7, git rules, validation, Definition of Done |
| [docs/brief.md](docs/brief.md) | The product brief and the eight build phases |
| `docs/specs/`, `docs/plans/` | One spec and one TDD plan per phase or change |
| `.claude/skills/`, `.codex/skills/` | Skills that enforce the process (Codex copies are generated) |
| [.mcp.json](.mcp.json) | MCP servers for agents: Playwright and Prisma |

**Continuing the work? Read [docs/HANDOFF.md](docs/HANDOFF.md) first.**

Start any agent session in the repo root. Claude Code picks up `CLAUDE.md` and the skills automatically; ask it to use `majlis-workflow` first. Codex picks up `AGENTS.md` and `.codex/skills/`.

### Parallel work with worktrees

```bash
sh scripts/worktree-add.sh feat/gallery-filters   # creates .worktrees/feat/gallery-filters
sh scripts/worktree-cleanup.sh                    # dry run; --apply removes merged worktrees
```

### Editing skills

Edit the copy in `.claude/skills/`, then:

```bash
node scripts/skills.mjs sync    # regenerate .codex/skills
node scripts/skills.mjs check   # CI runs this
```

## Getting started (after Phase 1)
## Getting started

```bash
npm install
cp .env.example .env
cp .env.example .env         # then set AUTH_SECRET (npx auth secret) and HASH_SALT
npm run db:start            # local PostgreSQL; keep it running in its own terminal
npx prisma migrate dev
npx prisma db seed
npm run dev
```