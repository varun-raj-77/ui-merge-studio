# UI Merge Studio — Phase 0

UI Merge Studio is a local React/Vite product proof for running multiple React branches as complete interactive applications, visually selecting branch-specific UI changes, and creating one verified combined branch. Its ink, warm-ivory, and signal-orange product shell explains the controlled sample before launch and keeps the causal path visible: **Compare → Select → Combine → Verify**.

Run `npm run dev`, open `http://127.0.0.1:4310`, and choose **Try sample demo**. The responsive comparison supports side-by-side, navigation-branch focus, and activity-branch focus without horizontal preview dragging. Return to the overview without destroying active previews, explicitly stop the demo when desired, and open source or verification evidence only from contextual links.

The controlled default compares the **Navigation experiment** with the **Activity-filter experiment**. Guided selection recommends the collapsible navigation and activity filters, explains included supporting code and excluded unrelated edits, and requires confirmation before compatibility planning. After verification, a live result workspace switches among both source branches and `combined-result`.

This repository contains the controlled Support Operations Dashboard fixture and seven UI Merge Studio falsification/product experiments. Prompt 007 tested the architecture against the real FlowCraft repository and returned **ABANDON**: FlowCraft is Next.js 14, while preview launch, instrumentation, readiness, and route synchronization are currently Vite- and fixture-specific. FlowCraft itself builds and passes its tests, but UI Merge Studio cannot honestly map it without adding the explicitly out-of-scope Next.js runtime adapter. This remains a controlled-fixture product proof, not an arbitrary merge pipeline.

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
npm run test:test-slicing
npm run test:candidate-generation
npm run test:candidate-integration
npm run test:e2e
npm run build
```

The generated standalone repository is written to `fixtures/generated/support-dashboard` and is ignored by the outer repository. Generation refuses to replace a dirty fixture; use `npm run fixture:create -- --recreate` only after confirming generated work is disposable. Node 20+, Git, and npm are required. Playwright browsers can be installed with `npx playwright install chromium`.

Commit timestamps and therefore commit SHAs may vary between runs; branch trees and behavior are deterministic.

## Rendered source-mapping experiment

Run `npm run dev` and open `http://127.0.0.1:4310`. The Studio can launch two independently managed detached-worktree previews. Compatible fixture checkouts synchronize the `/tickets?ticket=…` comparison context in either direction; incompatible path-contract previews remain interactive and show an explicit refusal. Desktop, tablet, and mobile frame dimensions are applied to both previews. Source selections retain branch, controller slot, session UUID, generation, runtime instance, and stable definition identity. Instrumentation is absent from production builds.

Only the controlled ticket route/entity adapter is supported. Local sidebar state and arbitrary React, Redux, Zustand, or server state remain independent.

## Dependency-aware feature-slice experiment

After choosing a rendered area, the Studio automatically validates the live preview/session/commit identity, diffs the branch from its merge base with `main`, indexes TypeScript/TSX with Babel, and returns the smallest supported evidence-backed set of changed declarations plus conservative whole-file styles/assets. Guided Mode shows a human-readable feature name and readiness summary. Technical details shows boundary escalation, included changes, test-unit evidence, excluded branch/test changes, unresolved edges, and a deterministic downloadable JSON artifact under `.ums/analysis/`.

Production analysis is driven by Git and source evidence: it has no fixture feature tables, branch-name/title semantics, or manual filename input. A resolved slice is an analysis result, not a safe merge plan. Dynamic test factories, inseparable mixed setup, dynamic module paths, unsupported aliases/re-exports, inseparable source regions, and other unsupported dependency mechanisms remain partial or refused.

## Deterministic candidate-generation experiment

With two current resolved slices, the Studio automatically performs the read-only safety check and enables one **Create verified branch** action. The generator validates immutable slice hashes, commits, merge base, evidence, repository cleanliness, and the candidate name. It plans every mutation before creating a detached worktree, reconstructs declarations and test units with AST identities, reconciles imports/static re-exports, audits the exact changed-file set, and runs install, typecheck, full/focused tests, and build before registering `combined-result`.

Runtime reports live under `.ums/generation/` and are ignored. An equivalent existing tree reports idempotent success; a different branch, conflict, unsupported mixed file, or failed check is preserved and refused/failed without a successful commit. The verified fixture result excludes the sidebar heading delta, inspector sorting utility/change, and sorting test. Whole-file additions are allowed only for fully slice-owned added blobs; mixed modified CSS and ambiguous ownership remain refused.
