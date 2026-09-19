# Self-improvement loop

The project improves in small, verified, reviewed steps, and each step also improves how the next one is done. It is a loop, not a one-off clean-up. The agent entry point is the `/improve` skill (`.claude/skills/improve/SKILL.md`).

```
  backlog (GitHub issues, label auto-improve) ◀── audit findings
      │                                                  ▲
      ▼                                                  │
   pick ONE ─▶ change ─▶ verify ─▶ draft PR ─▶ human review ─▶ merge
                          │
                          └─▶ lesson learned? ─▶ docs/learnings.md
```

## Signals

| Signal | How to read it |
| --- | --- |
| Backlog | `gh issue list --label auto-improve --state open` |
| Gate | `npm run check` (typecheck + tests + build) |
| Fuzz | `FUZZ_SEEDS=2500 npm test -- invariants`; a failure prints the seed, replay it with `randomExport(seed, stationNames)` |
| Fictional profiles | `npm run sample -- out.csv --profile lyon\|regional\|tiny\|single\|foreign\|roundtrips`, then import in the app or `npm run inspect -- out.csv` |
| Lessons | `docs/learnings.md` |

## One iteration

1. **Orient.** Read `CLAUDE.md` and `docs/learnings.md`. `git fetch`, then branch from `origin/main` as `auto/<issue>-<slug>`.
2. **Choose one thing.** The issue passed as argument; otherwise the oldest open `auto-improve` issue that needs no product decision. Empty backlog: run the audit below and file the findings as issues instead of fixing everything at once.
3. **Change.** Smallest diff that solves it. For a bug, add the regression test first (extend `src/lib/parsing/__fixtures__/randomExport.ts` when a whole class of input was missing).
4. **Verify.** `npm run check`. If the UI changed: run the app on a free port, import fictional profiles at desktop width and 375 px, and check the console is clean. If the gate still fails after two attempts, stop, comment your findings on the issue, and open no PR.
5. **Record.** A non-obvious lesson goes to `docs/learnings.md` (symptom → cause → rule, at most 3 lines). A behaviour change goes to the relevant doc.
6. **Deliver.** Push and open a **draft** PR that references the issue. Wait for human review. Never merge, never push to `main`.

## Audit (empty backlog)

- Run the gate and a 2 500-seed fuzz campaign.
- Import every fictional profile; note crashes, mobile layout breaks, console warnings, unreadable copy.
- Look for dead code, duplicated logic, and missing tests around `parseSncfCsv` and `buildWrappedView`.
- Re-check the `CLAUDE.md` constraints against the code: network calls, adaptive rankings, responsiveness.
- File each finding as its own issue (label `auto-improve`) with reproduction steps.

## Guardrails

- Privacy is not negotiable: no network call with file content, no real export in the repo or in `public/`, `privacy.test.ts` stays green.
- Use fictional data only. If a real export exists on the machine, do not open, copy or quote it.
- One issue per PR; no drive-by refactors; keep the mockup's design and animations unless the issue says otherwise.
- The dev server on port 5173 may belong to the user: do not stop it, preview on another port (`npm run dev -- --port 5180`).
- Do not touch `main`, tags, releases, repository settings or secrets.

## Running it

- On demand: `/improve`, or `/improve 12` for issue #12.
- While a Claude Code session stays open: `/loop 7d /improve`.
- Unattended: a weekly cloud routine (`/schedule`) that runs `/improve` on this repository. It must only open draft PRs. Not enabled yet: tracked in issue #11.

CI (`.github/workflows/ci.yml`) runs the gate on every PR, so any change, human or automated, is checked the same way.
