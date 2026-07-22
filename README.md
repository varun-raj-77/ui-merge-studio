# UI Merge Studio — Phase 0 fixture

This repository contains the controlled Support Operations Dashboard fixture and three UI Merge Studio falsification experiments: rendered React element-to-source mapping, a two-preview comparison workspace, and dependency-aware feature-slice analysis. It does **not** apply slices, create a candidate branch, or implement a merge pipeline.

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
npm run test:source-analysis
npm run test:feature-slice
npm run test:e2e
npm run build
```

The generated standalone repository is written to `fixtures/generated/support-dashboard` and is ignored by the outer repository. Generation refuses to replace a dirty fixture; use `npm run fixture:create -- --recreate` only after confirming generated work is disposable. Node 20+, Git, and npm are required. Playwright browsers can be installed with `npx playwright install chromium`.

Commit timestamps and therefore commit SHAs may vary between runs; branch trees and behavior are deterministic.

## Rendered source-mapping experiment

Run `npm run dev` and open `http://127.0.0.1:4310`. The Studio can launch two independently managed detached-worktree previews. Compatible fixture checkouts synchronize the `/tickets?ticket=…` comparison context in either direction; incompatible path-contract previews remain interactive and show an explicit refusal. Desktop, tablet, and mobile frame dimensions are applied to both previews. Source selections retain branch, controller slot, session UUID, generation, runtime instance, and stable definition identity. Instrumentation is absent from production builds.

Only the controlled ticket route/entity adapter is supported. Local sidebar state and arbitrary React, Redux, Zustand, or server state remain independent.

## Dependency-aware feature-slice experiment

After selecting a rendered boundary in either preview, choose **Analyze feature slice**. The server validates the live preview/session/commit identity, diffs the branch from its merge base with `main`, indexes TypeScript/TSX with Babel, and returns the smallest supported evidence-backed set of changed declarations plus conservative whole-file styles/tests/assets. The per-preview panel shows boundary escalation, included changes, excluded branch changes, unresolved edges, and a deterministic downloadable JSON artifact under `.ums/analysis/`.

Production analysis is driven by Git and source evidence: it has no fixture feature tables, branch-name semantics, or manual filename input. A resolved slice is an analysis result, not a safe merge plan. Dynamic module paths, unsupported aliases/re-exports, inseparable source regions, and other unsupported dependency mechanisms remain partial or refused.
