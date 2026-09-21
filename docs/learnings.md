# Learnings

Pitfalls this project already hit. Add a lesson only if it is non-obvious and would bite again: symptom → cause → rule, at most 3 lines. Newest first.

- **Tap navigation (screen 06→07) bounced back / lost taps under rapid tapping.** A first fix targeted a plausible-looking symptom (the map screen resetting state on exit) but the real cause was `useStoryTapNavigation` computing "current section" from a possibly-stale `scrollTop` mid-scroll. → Don't trust a one-off DOM read for "where are we" in a scroll-driven UI; derive it from a continuously self-correcting source (here, the same `IntersectionObserver` already tracking visibility) and share it with anything that needs to know.
- **Scripting a browser tab the user is also driving.** `navigate` to the *same URL* does not reload, and clicks collide with their session. → Use a dedicated tab and a changing query (`?t=1`); never script a tab someone is using.
- **`useEffect(() => window.scrollTo(0, 0))` crashed the app** ("destroy is not a function"). The arrow shorthand returns `scrollTo`'s value, which React takes for a cleanup. → Effects use block bodies unless they return a cleanup function.
- **The map animation crashed on its first frame** (`Cannot read properties of undefined (reading 'legs')`). The `requestAnimationFrame` timestamp can precede the `performance.now()` taken when scheduling, so progress went negative. → Clamp progress to `[0, 1]` and keep `evaluateMap` total; the original mockup has the same latent bug.
- **Regexes lost their backslashes when code went through a shell heredoc** (`/[^\s@]+/` became `/[^s@]+/`: still valid, silently wrong). → Write code with the editor tools, not `node - <<EOF`; re-read regexes after generation.
- **A real export copied into `public/` would be deployed** (`public/` is copied to `dist/`). → Never. CI fails if a `.csv` is tracked or lands in `dist/`.
- **The SNCF export is Windows-1252**, so reading it as UTF-8 gives `�`. → Always decode with `decodeCsvBytes` / `readCsvFile`.
- **Hot-linked Google Fonts leak the visitor's IP to a third party**, contradicting "no tracking". → Fonts are self-hosted (`@fontsource/schibsted-grotesk`).
- **`typescript-eslint` refuses to run at all on TypeScript 7** (the project's pinned version), hard error not a warning. → Lint uses `oxlint` instead (no dependency on the TS compiler); see typescript-eslint/typescript-eslint#10940.
