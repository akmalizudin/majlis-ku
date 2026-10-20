## Summary

<!-- Behavior change in plain language, then the technical change. Name the phase. -->

## Area(s) touched

<!-- e.g. guest, gallery, media, ecard, rsvp, payments, admin, auth, i18n, infra -->

## Contract changes

<!-- Prisma models and migrations, routes and server actions, Zod schemas, env variables, i18n keys. "None" if none. Teammates depend on these. -->

## Tests and evidence

- [ ] Failing test written first
- [ ] `lint`, `typecheck`, `test`, `build` pass (paste counts)
- [ ] Guest routes' first-load JS under 150 KB (guest-facing change)
- [ ] E2E passes (upload, gallery, or payment flow change)
- [ ] `node scripts/skills.mjs check` passes (skill change)

## Checklist

- [ ] Prices, limits, and quotas come from the server, never the client
- [ ] Every boundary validated with Zod; no cross-event access
- [ ] Media served through signed URLs; galleries private by default
- [ ] Webhooks verified and idempotent (payments change)
- [ ] New strings in both `messages/ms.json` and `messages/en.json`
- [ ] No real personal data in seed, fixtures, or screenshots
- [ ] `CLAUDE.md`, `AGENTS.md`, and `.env.example` current

## Rollout notes

<!-- Migrate? Seed? New env variable? Anything teammates must do after merging. -->
