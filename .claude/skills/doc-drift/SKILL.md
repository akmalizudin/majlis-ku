---
name: doc-drift
description: Use when Majlis Ku code or behavior diverges from CLAUDE.md, AGENTS.md, playbook.md, docs/brief.md or a spec, and after any change that alters layout, rules, contracts, env variables, status, stack, or process. Keeps the docs and skills current.
---

# Doc Drift

Docs that disagree with the code mislead teammates and agents. After a change, and whenever you
notice a mismatch, reconcile them.

## What to check

| If the change alters | Update |
| --- | --- |
| Phase progress | The status table in `CLAUDE.md` and the status line in `AGENTS.md` |
| Layout, stack, commands, rules | `CLAUDE.md` and `AGENTS.md` (they must say the same) |
| An env variable | `.env.example` (with a comment) and `src/lib/env.ts` |
| An MCP server | `.mcp.json`, and the MCP section of `CLAUDE.md` and `AGENTS.md` |
| A requirement or price agreed with the developer | `docs/brief.md` and the affected spec |
| Process, gates, validation commands | `playbook.md`, and the lifecycle skills that mention them |
| A skill | Run `node scripts/skills.mjs sync`, then `node scripts/skills.mjs check` |

## Procedure

1. List the statements in the docs that the change makes untrue or incomplete.
2. Fix them in the same change, not a follow-up.
3. Keep facts in the handbooks. Skills point to them; they do not copy them.
4. Keep `CLAUDE.md` and `AGENTS.md` consistent: the same project, rules, and commands.
5. Update the "Last updated" line in `CLAUDE.md`.
6. If a doc statement is wrong and you cannot tell which side is right, ask the developer.

## Common mistakes

- Updating `CLAUDE.md` but not `AGENTS.md`.
- Adding an env variable to the code but not to `.env.example`.
- Copying a command into three skills so they drift apart.
