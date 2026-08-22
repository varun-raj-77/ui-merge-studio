# Prompt 014 — external Vite integration falsification

## Verdict

**MODIFY — idea remains viable but a specific architectural assumption requires another bounded experiment.**

UI Merge Studio mapped two rendered features in an unrelated React + TypeScript + Vite application, resolved meaningful dependencies, carried one canonical Integration Plan V2 through exact-base generation, passed the repository's real checks, launched the generated candidate, and reproduced Git tree `9160d2e0af6c37acb3fa02d697153af9d2aa4fc7`.

The Phase-0 claim nevertheless failed. The selected `WorkspaceStatusBanner` required integration through existing `PageContent`. That parent also contained an unrelated `Experimental density controls enabled` sibling. Preflight called the operation `replace-jsx-region`, but execution replaced the full `PageContent` declaration, so the unrelated sibling appeared in the candidate. Green compilation, runtime, and determinism did not make the candidate selective.

## 1. Starting UI Merge repository state

- Path: `C:\Users\rekha\OneDrive\Documents\UI merge studio`
- Branch: `main`
- HEAD: `8d4cd1789f708e0ad688c233efa2b15bdbd0e27d` — `Enforce canonical visual selection causality`
- `origin/main`: same commit
- Initial status: clean
- Initial worktrees: one, the main checkout

## 2. External repository chosen

- Historical checkout: `C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation`
- Upstream: `https://github.com/larry-xue/react-admin-dashboard.git`
- Pinned upstream foundation: `8223897259151c450f954e462c57df3703d5508d`
- Disposable reproducible checkout: `.validation-worktrees/prompt014-external-vite`
- Package manager: npm (`package-lock.json`; 252 packages installed)
- Stack: React 19, TypeScript project references, Vite 8, React Router, Ant Design, Zustand
- License: MIT in the source checkout

The application qualifies as unrelated because its full dashboard history, routes, authentication, profile, customer/team management, theme system, and upstream origin predate and exist independently of UI Merge. The old `ui-merge-validation-*` feature refs do not qualify as strong Prompt-014 evidence: their commits are explicitly test-shaped and select declarations already present in the foundation. They remain a historical control only.

To avoid vendoring the dashboard, `npm run external:prepare` clones exact commit `8223897` and applies two small conventional feature patches into a disposable managed checkout. The patches are repository-specific test/bootstrap material, not source/dependency authority and not product runtime behavior. They deliberately create the ordinary mixed-parent condition the old control omitted.

## 3. External branch structure

- Foundation: `prompt014-foundation` → `8223897259151c450f954e462c57df3703d5508d`
- Feature A: `prompt014-workspace-status` → `b7e057f631bd3482fb7c68ea359afca4c3f05593`
- Feature B: `prompt014-revenue-pulse` → `04b4228a5ab3316214368cca38b26a9af15ada78`
- Common ancestor for both sources and foundation: `8223897259151c450f954e462c57df3703d5508d`
- Candidate: `prompt014-external-candidate` → `994c8628122997ae21168cc4fed4d8a6e3bdb4e1`
- Candidate parent: exact foundation `8223897259151c450f954e462c57df3703d5508d`

The two source commits are divergent one-commit branches from the pinned foundation. Fixed author/committer dates make their identities reproducible.

## 4. External feature topology

### Feature A — workspace status

- Visible selected behavior: `Release workspace ready`
- Clicked boundary: `WorkspaceStatusBanner`
- Instrumented source: `src/components/layout/workspace-status/WorkspaceStatusBanner.tsx:4:14`
- Analyzed boundary: `PageContent` in `src/components/layout/contentbar.tsx`
- Expansion reason: the new child did not exist in the foundation; the added render edge from existing `PageContent` was required to connect it.
- Dependencies: `WorkspaceStatusBanner.module.css`, `useWorkspaceStatus`, `WorkspaceStatus`, `workspaceStatuses`, and the required parent import/render declaration.
- Unrelated neighboring behavior: `Experimental density controls enabled`, added as a sibling inside the same `PageContent` declaration.

### Feature B — revenue pulse

- Visible selected behavior: `Revenue pulse: healthy`
- Clicked boundary: `RevenuePulseBadge`
- Instrumented source: `src/views/dashboard/RevenuePulseBadge.tsx:3:14`
- Analyzed boundary: `RevenueTrendChart` in `src/views/dashboard/index.tsx`
- Expansion reason: the new SVG child did not exist in the foundation; the existing chart declaration supplied the required added render edge.
- Dependencies: `useRevenuePulse`, `RevenuePulse`, `revenuePulses`, and the required chart import/render declaration.
- Unrelated branch behavior: `revenue experiment footer` in `src/components/layout/index.tsx#PageLayout`.

## 5. Pre-edit falsification assessment

Current HEAD supported generic Vite instrumentation, server-owned opaque-receipt resolution, static source indexing, dependency traversal, exact base/source/common-ancestor checks, canonical plan projection, deterministic AST generation, npm verification, and generated-worktree preview.

Before corrections, the reproducibility/evidence path failed the Prompt-014 standard:

- three external Vitest tests were environment-gated;
- those tests manually constructed `SourceIdentity` from hard-coded filenames/components;
- two external Playwright specs were globally ignored;
- the old feature branches were authored for validation;
- old selections were existing foundation declarations, so integration-boundary expansion was never tested;
- the target has no application test script and requires an explicit legitimate verification matrix.

Hypothesis: the old control would pass, but an ordinary new-child expansion with unrelated JSX inside the same parent would either be refused or reveal whole-declaration over-inclusion. The latter occurred.

## 6. Files changed in UI Merge

- `package.json`: adds explicit external prepare and E2E scripts.
- `scripts/prepare-external-vite-falsification.ts`: clones the pinned upstream revision and creates deterministic disposable source branches.
- `tests/external-vite/workspace-status.patch`: conventional Feature A plus the co-located falsification challenge.
- `tests/external-vite/revenue-pulse.patch`: conventional Feature B plus a separable unrelated footer edit.
- `apps/studio/playwright.external.config.ts`: dedicated external repository/runtime/verification configuration.
- `tests/e2e/external-vite-falsification.spec.ts`: rendered selection, canonical plan, generation, runtime, exclusion, leak, and determinism proof.
- `apps/studio/playwright.config.ts`: keeps the external-only spec out of the Product Catalogue server run; the dedicated config executes it.
- `.gitignore`: exposes this Prompt-014 record.
- `README.md`, `docs/evaluation.md`, `docs/limitations.md`, `docs/risk-register.md`, `docs/decision-log.md`: narrow the public claim and record the architectural decision.
- This file: complete evidence record.

No production analyzer, instrumentation, plan, preview, or generator implementation was changed.

## 7. External repository changes

The original historical checkout was not edited. The disposable bootstrap created two source commits and the product created one candidate commit under UI Merge's ignored `.validation-worktrees` directory. Source patches are test/bootstrap-only and contain no UI Merge imports, metadata, source maps, dependency lists, or product adapters.

## 8. Source mapping evidence

The browser clicked rendered text only. Normal analysis requests carried opaque current-session receipts. Server-owned instrumentation resolved:

- `Release workspace ready` → `WorkspaceStatusBanner.tsx:4:14` → analysis `15e0a2809b0f353f`
- `Revenue pulse: healthy` → `RevenuePulseBadge.tsx:3:14` → analysis `0d0cb89c5a650c2d`

The E2E did not construct source paths, component names, line numbers, `SourceIdentity`, artifacts, dependency paths, or feature file lists as input. Component/path strings appear only as post-analysis assertions.

## 9. Dependency slicing evidence

Feature A included:

- `src/components/layout/contentbar.tsx#PageContent`
- `WorkspaceStatusBanner.tsx#WorkspaceStatusBanner`
- `WorkspaceStatusBanner.module.css`
- `useWorkspaceStatus.ts#useWorkspaceStatus`
- `workspaceStatusConfig.ts#WorkspaceStatus`
- `workspaceStatusConfig.ts#workspaceStatuses`

Feature B included:

- `src/views/dashboard/index.tsx#RevenueTrendChart`
- `RevenuePulseBadge.tsx#RevenuePulseBadge`
- `useRevenuePulse.ts#useRevenuePulse`
- `revenuePulseConfig.ts#RevenuePulse`
- `revenuePulseConfig.ts#revenuePulses`

The generated candidate contained all runtime dependencies and passed lint, TypeScript, build, and live interaction checks.

## 10. Integration-boundary expansion analysis

This is the decisive result.

Both clicked children were new and expanded through an added render edge to the nearest declaration that existed in the foundation. That part was correct and generic.

Feature B was safely separable: `RevenueTrendChart` was replaced and its dependency chain added; the unrelated `PageLayout` footer declaration was proven unrelated and excluded.

Feature A was not safely separable. `PageContent` contained both the required `<WorkspaceStatusBanner />` insertion and an unrelated `<p>` sibling. Analysis represented `PageContent` as one included integration declaration and produced no exclusion for the sibling because it has no separate declaration identity. Preflight emitted operation `op:cceab9ad35d81504`, kind `replace-jsx-region`, target `contentbar.tsx#PageContent`. Execution handles `replace-jsx-region` through the same `replaceDeclaration(...)` path as `replace-declaration`, copying lines 26–46 from the source branch. The candidate therefore rendered the unrelated density marker.

The plan label suggests finer granularity than the transform implements. This is a general architectural limitation, not a repository-specific mapping gap.

## 11. Unrelated-change exclusion evidence

- Correctly excluded: Feature B's `src/components/layout/index.tsx#PageLayout` footer change. It is listed as `proven-unrelated`, absent from candidate changed paths, and absent in the generated runtime.
- Incorrectly included: Feature A's `Experimental density controls enabled` sibling inside `PageContent`. It is visible in the generated candidate and present in the candidate diff.

Because one explicit unrelated change leaked, the core “only selected changes” criterion failed.

## 12. Canonical Integration Plan evidence

- Version: 2
- Identity: `plan-v2-73f94a35`
- Repository: `local-git-e25368e1d530f684`
- Pinned foundation/common ancestor: `8223897259151c450f954e462c57df3703d5508d`
- Source commits: `b7e057f…` and `04b4228…`
- Selection count: 2
- Server-owned slice IDs: `15e0a2809b0f353f`, `0d0cb89c5a650c2d`

The same identity appeared in browser preflight input and persisted generation report. The browser supplied only the canonical plan and identity to generation.

## 13. Candidate-generation evidence

- Candidate commit: `994c8628122997ae21168cc4fed4d8a6e3bdb4e1`
- Parent: `8223897259151c450f954e462c57df3703d5508d`
- Tree: `9160d2e0af6c37acb3fa02d697153af9d2aa4fc7`
- Changed paths: nine — `contentbar.tsx`, four workspace-status files, `dashboard/index.tsx`, and three revenue-pulse files.
- Excluded path: `src/components/layout/index.tsx`
- Manual edits after generation: none
- Candidate worktree: temporary, verified, previewed, and removed

The candidate branch was output only and was never a selection source.

## 14. Verification evidence

The pinned foundation and each disposable feature branch independently passed their legitimate commands: `npm ci --no-audit --no-fund`, `npm run lint`, and `npm run build`. `build` runs `tsc -b && vite build`; there is no separate `typecheck` or application test script.

The generated candidate ran the same three-command matrix. All returned exit code 0. The final generated-worktree preview rendered both selected behaviors and the main dashboard, excluded the footer marker, and visibly exposed the density leak. No console errors were observed.

## 15. Determinism evidence

The exact same semantic plan was submitted twice. First generation created candidate commit `994c862…`; the second returned `idempotent: true` and the same tree `9160d2e0af6c37acb3fa02d697153af9d2aa4fc7`. Determinism succeeded, but deterministically reproduced the over-inclusion.

## 16. Refusals encountered

The historical control still proves legitimate stale-commit and overlapping-declaration refusals (3/3 opt-in Vitest tests passed). The Prompt-014 combination itself was not refused. That is the failure: current architecture accepted and verified an unsafe mixed-parent expansion.

No artificial incompatibility was added.

## 17. Test results

All final commands returned exit code 0 unless explicitly listed as a diagnostic iteration.

- Historical external Vitest control: 1 file, 3/3 passed, 77.16s.
- Historical checkout baseline: install added 252 packages in 27s; lint passed; build passed in 14.89s.
- Feature A baseline: install added 252 packages in 24s; lint passed; build passed in 7.80s.
- Feature B baseline: install added 252 packages in 30s; lint passed; build passed in 7.65s.
- `npm run typecheck`: passed.
- Dedicated external Playwright: 1/1 passed in 9.1m. It asserts the selected behaviors, excluded footer, leaked sibling, verification gates, real candidate preview, and identical replay tree.
- `test:instrumentation`: 10/10, 38.27s.
- `test:preview-runtime`: 17/17, 16.36s.
- `test:studio`: 119/119, 130.57s.
- `test:source-analysis`: 16/16, 72.01s.
- `test:feature-slice`: 5/5, 33.36s.
- `test:test-slicing`: 12/12, 49.83s.
- `test:candidate-generation`: 21/21, 137.00s.
- `test:candidate-integration`: 4/4, 782.05s.
- `fixture:verify`: passed.
- `npm run build`: Showcase package validated (64 candidates); 52 modules built in 5.40s.
- `npm run test:e2e`: 42/42, 4.8m.
- `npm test`: 29 files passed, 1 explicitly skipped; 191 tests passed, 3 historical environment-gated external tests skipped; 1127.41s.
- `git diff --check`: passed.

Diagnostic iterations were retained rather than hidden:

- First external Vitest attempt: exit 1 due sandbox `EPERM`; approved rerun passed.
- First external E2E: 1 failed after 1.9m because a responsive unrelated marker was not rendered in the narrow iframe; the marker moved to an always-rendered footer.
- Second external E2E: 1 failed after 2.0m because the test expected operation name `replace-declaration`; inspection showed the actual name was `replace-jsx-region` despite whole-declaration execution.
- First default E2E after adding the spec: 42 passed, 1 failed because the external-only spec was not excluded from the Product Catalogue config. The dedicated external config still runs it; corrected default rerun passed 42/42.

No assertion was weakened to conceal the architectural failure. The final external test positively requires the unrelated density marker to be present in the candidate so a future safe isolation/refusal change must deliberately update the verdict and oracle.

## 18. Hard-coded or repository-specific behavior introduced

**Generic product behavior: NONE.**

Repository-specific behavior exists only in the reproducible test/bootstrap layer: pinned upstream URL/commit, patch paths, branch names, preview route, legitimate target commands, selectors, and post-analysis evidence assertions. No component name, source path, dependency path, or branch-specific transform was added to generic analysis/generation code. No runtime adapter supplies source authority.

## 19. What this experiment proves

- The canonical rendered-selection path runs on one unrelated conventional React + TypeScript + Vite application.
- Normal React child components, hooks, interfaces, config constants, CSS modules, and SVG composition are mapped and reconstructed without manual generation inputs.
- Exact foundation/source/common-ancestor validation, real candidate verification/preview, separate-file exclusion, and deterministic replay work on this case.
- Declaration-level expansion is unsafe when required and unrelated JSX changes coexist in one existing parent declaration.
- Green checks and deterministic output do not prove semantic selectivity.

## 20. What this experiment does not prove

- General support for Vite or React repositories.
- Safe arbitrary intra-declaration slicing.
- Application test discovery/slicing; the target has no test script.
- Dynamic imports, aliases, CSS-in-JS, monorepos, alternative package managers, Next.js, backend state, or more than two selections.
- That the bootstrap feature commits were naturally occurring upstream branches; they are conventional but intentionally reproducible falsification deltas.
- That a deterministic region-level transform or refusal can be implemented cheaply.

## 21. Seven-question milestone review

1. **What has actually been proven?** One unrelated app completes mapping, dependency reconstruction, canonical planning, exact-base generation, checks, runtime, and replay; a mixed-parent selection leaks unrelated JSX.
2. **What remains assumed?** That a general deterministic region transform or conservative mixed-parent refusal can close the gap without breaking ordinary composition.
3. **What is fixture-specific?** Product Catalogue adapters remain fixture-specific; Prompt-014 branch patches and selectors are external-test-specific. Generic instrumentation/analysis/generation received no mappings.
4. **What would a skeptical senior engineer challenge?** The test-authored source branches, absence of application tests, misleading `replace-jsx-region` name, and whether semantic diff isolation can be proven across arbitrary JSX control flow.
5. **What would a recruiter understand?** The system genuinely runs and combines code from another app, and the experiment deliberately found a real case where a green build still included an unchosen UI change.
6. **Does UI Merge still deserve flagship status?** Yes as a technically honest flagship experiment, not yet as a broadly reliable integration product. Its value now depends on addressing or refusing mixed-parent changes.
7. **What is the smallest next experiment?** Add a hermetic analyzer/generator case with one required child insertion and one unrelated sibling edit in the same parent. Implement either evidence-connected JSX edit projection with explicit pre/postconditions or preflight refusal, then rerun this exact external E2E and require the density marker to be absent or generation to refuse before mutation.

## 22. Phase-0 verdict rationale

**MODIFY — idea remains viable but a specific architectural assumption requires another bounded experiment.**

ABANDON is premature because the normal path, dependency graph, exact Git identities, verification, runtime, and replay all functioned on unrelated code. PASS would be false because the candidate did not contain only selected changes. The precise assumption to modify is that declaration-boundary inclusion labeled `replace-jsx-region` provides source-level selectivity.

## 23. Final cleanup state

- UI Merge: `main` remains at `8d4cd17`; only uncommitted Prompt-014 harness/documentation changes exist; no extra Git worktree.
- Historical external checkout: still on clean `main` at `8223897`; its original branches and generated historical candidate were not changed.
- Disposable external checkout: clean on `prompt014-foundation`; source refs and candidate output retained for inspection; no candidate worktree remains.
- Ports: no UI Merge/preview listeners remain on checked development ports.
- Processes: Playwright and preview/server child processes exited.
- Install/build artifacts remain only where normal ignore policy permits (`node_modules`, `dist`, `.validation-worktrees`, `.ums`, `test-results`).

## 24. Confirmations

- No manual filename selection: confirmed.
- No per-feature dependency mapping: confirmed.
- No LLM merge authority: confirmed.
- No disabled or weakened tests: confirmed. External-only specs are routed through a dedicated config; the three historical opt-in tests remain explicitly reported as skipped in the aggregate suite.
- No manual edits to the generated candidate: confirmed.
- No commit to UI Merge or the original external checkout: confirmed. Disposable source/candidate commits are test and product outputs required by the experiment.
- No push: confirmed.
- No deploy: confirmed.

## Prompt 015 historical addendum

Prompt 014 remains a failure record. Its candidate `994c8628122997ae21168cc4fed4d8a6e3bdb4e1` and leaking tree `9160d2e0af6c37acb3fa02d697153af9d2aa4fc7` are retained in `.validation-worktrees/prompt014-external-vite`; the density-control leak is not rewritten as a success.

Prompt 015 reran the same foundation and feature commits in `.validation-worktrees/prompt015-external-vite`. The corrected candidate `2925af336489aef6640c6cb66996eae7994a9388` has parent `8223897259151c450f954e462c57df3703d5508d` and tree `ecc68ab021158f978aa184640605f9a7b21d5949`. It contains both selected features and required dependencies, excludes both `Experimental density controls enabled` and `revenue experiment footer`, passes the legitimate external install/lint/TypeScript-build/runtime matrix, and returns the same tree on replay. Prompt 015F subsequently removed expression replacement and the unsafe region-to-declaration fallback. See `015-safe-jsx-region-projection.md` for the current bounded contract, refusal rules, diagnostics, and MODIFY verdict.

Prompt 015G does not rewrite this record. It moves the controlled Product Catalogue onto the same two direct-child `insert-child` operation shape while retaining dependency and exclusion depth. A fresh external rerun was attempted, but the environment rejected the required escalation before Playwright started because its approval quota was exhausted. The Prompt 015F external pass remains historical evidence; Prompt 015G remains MODIFY pending one fresh successful external run.
