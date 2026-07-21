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
npm run typecheck
npm run test:instrumentation
npm run test:preview-runtime
npm run test:studio
npm run test:e2e
npm run build
```

The generated standalone repository is written to `fixtures/generated/support-dashboard` and is ignored by the outer repository. Generation refuses to replace a dirty fixture; use `npm run fixture:create -- --recreate` only after confirming generated work is disposable. Node 20+, Git, and npm are required. Playwright browsers can be installed with `npx playwright install chromium`.

Commit timestamps and therefore commit SHAs may vary between runs; branch trees and behavior are deterministic.

## Rendered source-mapping experiment

Run `npm run dev` and open `http://127.0.0.1:4310`. The Studio shell inspects the generated repository, creates a detached temporary worktree for the chosen branch, starts an AST-instrumented development-only Vite preview, and removes the worktree when stopped. Instrumentation is absent from production builds.
