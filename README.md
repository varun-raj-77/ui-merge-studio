# UI Merge Studio — Phase 0 fixture

This repository builds a controlled Support Operations Dashboard Git fixture for the first falsification experiment. It does **not** implement UI Merge Studio's preview, mapping, dependency-slicing, or merge pipeline.

## Commands

```sh
npm ci
npm test
npm run fixture:create
npm run fixture:verify
npm run fixture:test
npm run fixture:build-all
```

The generated standalone repository is written to `fixtures/generated/support-dashboard` and is ignored by the outer repository. Generation refuses to replace a dirty fixture; use `npm run fixture:create -- --recreate` only after confirming generated work is disposable. Node 20+, Git, and npm are required. Playwright browsers can be installed with `npx playwright install chromium`.

Commit timestamps and therefore commit SHAs may vary between runs; branch trees and behavior are deterministic.

