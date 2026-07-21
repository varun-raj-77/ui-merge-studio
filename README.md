# UI Merge Studio — Phase 0 fixture

This repository contains the controlled Support Operations Dashboard fixture and the first two UI Merge Studio falsification experiments: rendered React element-to-source mapping and a two-preview comparison workspace. It does **not** implement dependency slicing or a merge pipeline.

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
npm run test:multi-preview
npm run test:e2e
npm run build
```

The generated standalone repository is written to `fixtures/generated/support-dashboard` and is ignored by the outer repository. Generation refuses to replace a dirty fixture; use `npm run fixture:create -- --recreate` only after confirming generated work is disposable. Node 20+, Git, and npm are required. Playwright browsers can be installed with `npx playwright install chromium`.

Commit timestamps and therefore commit SHAs may vary between runs; branch trees and behavior are deterministic.

## Rendered source-mapping experiment

Run `npm run dev` and open `http://127.0.0.1:4310`. The Studio can launch two independently managed detached-worktree previews. Compatible fixture checkouts synchronize the `/tickets?ticket=…` comparison context in either direction; incompatible path-contract previews remain interactive and show an explicit refusal. Desktop, tablet, and mobile frame dimensions are applied to both previews. Source selections retain branch, controller slot, session UUID, generation, runtime instance, and stable definition identity. Instrumentation is absent from production builds.

Only the controlled ticket route/entity adapter is supported. Local sidebar state and arbitrary React, Redux, Zustand, or server state remain independent.
