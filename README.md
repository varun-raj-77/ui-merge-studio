# UI Merge Studio — Phase 0

UI Merge Studio is a local React/Vite experiment for comparing two running UI versions, choosing one visible feature from each, and creating one verified combined branch. The default experience is Guided Mode: **Compare → Select → Combine → Verify**. It names the controlled fixture “Sample Support Dashboard,” automatically analyzes a visual choice, and keeps one persistent **Create combined branch** action.

Run `npm run dev`, open `http://127.0.0.1:4310`, and choose **Load both versions**. The server acknowledges each preview launch as an asynchronous operation, exposes truthful preparation phases, coalesces duplicate work, cancels or supersedes stale work, and retains a per-slot isolated worktree for safe warm restarts. Use **Technical details** for source identities, Git/AST evidence, operation timings, and deterministic artifacts.

The controlled default compares **Collapsible Sidebar Variant** from `branch-sidebar` with **Activity Filters Variant** from `branch-inspector`. Those labels are presentation-only. Preview orchestration, source mapping, feature slicing, conflict detection, and candidate generation operate on validated branch, commit, session, AST, and Git evidence.

This repository contains the controlled Support Operations Dashboard fixture and six UI Merge Studio falsification/product experiments. Prompt 006 makes the proven Prompt 001–005 path understandable and responsive without expanding the engine’s bounded claim. This is a controlled-fixture product proof, not an arbitrary merge pipeline.

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

With two current resolved slices, the Studio automatically performs the read-only safety check and enables one **Create combined branch** action. The generator validates immutable slice hashes, commits, merge base, evidence, repository cleanliness, and the candidate name. It plans every mutation before creating a detached worktree, reconstructs declarations and test units with AST identities, reconciles imports/static re-exports, audits the exact changed-file set, and runs install, typecheck, full/focused tests, and build before registering `combined-result`.

Runtime reports live under `.ums/generation/` and are ignored. An equivalent existing tree reports idempotent success; a different branch, conflict, unsupported mixed file, or failed check is preserved and refused/failed without a successful commit. The verified fixture result excludes the sidebar heading delta, inspector sorting utility/change, and sorting test. Whole-file additions are allowed only for fully slice-owned added blobs; mixed modified CSS and ambiguous ownership remain refused.
