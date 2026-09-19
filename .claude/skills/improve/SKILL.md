---
name: improve
description: Run one iteration of this project's self-improvement loop — pick a single open `auto-improve` GitHub issue (or audit the project and file new issues), fix it with a small verified change, record what was learned, and open a draft PR. Use when the user says "improve", "run the improvement loop", asks for the next improvement, or on a schedule.
---

# /improve — one iteration of the self-improvement loop

Full loop, signals and guardrails: `docs/self-improvement.md` (read it once per run). Pitfalls already hit: `docs/learnings.md`.

If the user passed an issue number (`/improve 12`), work on that issue. Otherwise:

1. **Orient.** Read `CLAUDE.md` and `docs/learnings.md`. Run `git fetch origin` and branch from `origin/main` as `auto/<issue>-<slug>`.
2. **Choose ONE thing.** `gh issue list --label auto-improve --state open` → the oldest issue that needs no product decision. If none, run the audit in `docs/self-improvement.md`, file each finding as a separate `auto-improve` issue, and stop there.
3. **Change.** Smallest diff that solves it. For a bug, write the failing test first.
4. **Verify.** `npm run check` must pass. UI change: preview on a free port (not 5173, it may be the user's), import fictional data (`npm run sample -- out.csv --profile tiny|single|foreign|regional|roundtrips|lyon`) at desktop width and 375 px, console clean. After two failed attempts: comment on the issue and stop, no PR.
5. **Record.** Non-obvious lesson → `docs/learnings.md` (≤ 3 lines). Changed behaviour → update the doc that describes it.
6. **Deliver.** Push, open a **draft** PR that closes the issue, list what you verified. Never merge, never push to `main`.

Non-negotiable: no network call with the CSV content, no real export in the repo or `public/`, `privacy.test.ts` green, adaptive rankings preserved, mockup design and animations unchanged unless the issue says so.
