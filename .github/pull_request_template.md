## Summary

<!-- What changes and why. Link the issue: Closes #N -->

## Checks

- [ ] `npm run check` passes (CI runs it too)
- [ ] No real export or personal data added (`*.csv` stays git-ignored, nothing in `public/`)
- [ ] Nothing sends the CSV content over the network (`privacy.test.ts` green)
- [ ] UI change: verified with fictional data (`npm run sample`), desktop and 375 px wide, console clean
- [ ] Rankings still adapt to small datasets; docs updated if behaviour changed
