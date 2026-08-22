# Prompt 015F — conservative JSX-region refusal before Phase-0 commit

## 1. Starting state

- Repository: `C:\Users\rekha\OneDrive\Documents\UI merge studio`
- Branch: `main`
- HEAD: `8d4cd1789f708e0ad688c233efa2b15bdbd0e27d`
- Prompt 014 and 015 changes were already uncommitted and were preserved.
- No commit, push, deployment, manual candidate edit, or repository-specific generation rule was used.

## 2. Blocker A — unsafe expression replacement

Old behavior allowed `replace-child` to copy an entire `JSXExpressionContainer`. A source shape equivalent to:

```tsx
{enabled ? <span>UNRELATED SOURCE CHANGE</span> : <Selected />}
```

could replace the base expression and copy the unrelated changed `span` text along with the selection.

Prompt 015F removes `replace-child` from the Phase-0 projection contract. If the selected JSX element is nested inside an expression or another enclosing JSX child, preflight reports that the selection overlaps an expression/enclosing replacement and refuses. The generator never creates a candidate worktree or ref, so no output can contain `UNRELATED SOURCE CHANGE`.

## 3. Blocker B — region-to-declaration widening

Old planning caught selected region-projection failures for changed parent shells or changed non-region declaration structure and invoked `proveSingleRenderDeltaDeclarationOwnership`. That proof considered rendered component/name evidence but could not exclude unrelated hooks, state, attributes, handlers, text, expressions, logic, or side effects.

Prompt 015F removes that proof and its operation evidence. A failure raised by `projectJsxRegion` now always becomes a terminal unresolved planning item ending with:

> Full declaration replacement fallback is forbidden for region-owned integration.

There is no catch-path that plans `replace-declaration`. Declaration replacement remains available for ordinary changes classified independently of integration-region projection.

## 4. Supported Phase-0 JSX-region subset

Supported:

- deterministic insertion of one uniquely identified selected `JSXElement` that is already a direct child of one structurally compatible existing JSX parent;
- a unique unchanged preceding/following sibling anchor, or an otherwise empty unique parent;
- unchanged declaration structure outside that parent;
- exact Git identities plus AST structural and content-hash pre/postconditions;
- deterministic required bindings referenced by the inserted child.

Refused:

- selected JSX nested inside a conditional, map, logical expression, or other enclosing child;
- expression/subtree replacement even when it appears convenient;
- ambiguous parent or anchor identity;
- changed parent shell or incompatible surrounding declaration structure;
- duplicate selected occurrences or a selected occurrence already present in base;
- every failed region projection that would require declaration-wide replacement.

## 5. Files changed by Prompt 015F

Production contract:

- `packages/candidate-generation/src/astTransform.ts`
- `packages/candidate-generation/src/candidateGenerator.ts`
- `packages/candidate-generation/src/types.ts`

Regressions:

- `tests/candidate-generation/candidateFailure.test.ts`
- `tests/candidate-generation/candidatePlanner.test.ts`
- `tests/candidate-generation/candidateIntegration.test.ts`

Milestone documentation:

- `README.md`
- `docs/evaluation.md`
- `docs/limitations.md`
- `docs/risk-register.md`
- `docs/decision-log.md`
- `docs/codex-prompts/014-external-vite-integration-proof.md`
- this report

The existing Prompt 014/015 external harness and evidence files were retained.

## 6. Adversarial replace-child regression

The focused generator regression uses base `{enabled ? <span>Foundation</span> : null}` and source `{enabled ? <span>UNRELATED SOURCE CHANGE</span> : <Selected/>}`.

It asserts repeated identical preflight refusal, an explicit overlapping-expression reason, no region or declaration operation for `App`, two repeated refused generation reports, no candidate ref, no generated worktree, and no candidate output containing the unrelated marker.

## 7. Adversarial declaration-ownership regression

The source integration adds the selected rendered child while also changing state, local handler logic, the root element, an attribute, a click handler, existing JSX text, and a rendered expression. The source shape would satisfy the former weak rendered-name proof. It now refuses during preflight, plans no operation at all for `src/App.tsx`, creates no worktree, and registers no candidate branch.

## 8. Direct region-fallback assertion

The ambiguous-parent regression and the declaration-ownership regression inspect the structured plan. Each requires the explicit fallback-forbidden reason and asserts that no `replace-declaration` operation is planned for the region-owned integration boundary.

## 9. Exact external Prompt 014 scenario

Fresh preparation recreated the unrelated Vite checkout at exact foundation `8223897259151c450f954e462c57df3703d5508d` and source commits:

- Workspace Status: `b7e057f631bd3482fb7c68ea359afca4c3f05593`;
- Revenue Pulse: `04b4228a5ab3316214368cca38b26a9af15ada78`.

`npm run test:e2e:external` passed 1/1 in 8.9 minutes. Both integrations use `insert-child`: `WorkspaceStatusBanner → PageContent` before the unchanged `Card`, and `RevenuePulseBadge → RevenueTrendChart` before the unchanged map expression.

## 10. Selected dependencies included

Workspace Status includes its component, CSS module, hook, config/type file, import, and rendered child. Revenue Pulse includes its component, hook, config/type file, import, and rendered child. No filenames or dependency map were supplied to generation manually.

## 11. Explicit unrelated exclusions

Candidate Git grep, source diff, and live runtime prove both are absent:

- `Experimental density controls enabled`;
- `revenue experiment footer`.

## 12. Candidate parent and tree

- Candidate: `2925af336489aef6640c6cb66996eae7994a9388`
- Exact parent: `8223897259151c450f954e462c57df3703d5508d`
- Tree: `ecc68ab021158f978aa184640605f9a7b21d5949`
- Changed paths: nine (two existing integration modules and seven deterministic dependency files).

## 13. Verification and runtime

The external generated worktree passed install, lint, TypeScript/Vite production build, and live browser runtime. Both selected behaviors rendered; both unrelated markers were absent; no unexpected console errors were observed.

## 14. Deterministic replay

The same canonical Integration Plan V2 was generated twice. Replay was idempotent and returned tree `ecc68ab021158f978aa184640605f9a7b21d5949`.

## 15. Controlled fixture regression

CategorySidebar and Quick View analysis, dependency discovery, exclusion of Promotion/Inventory changes, selection provenance, configuration planning, canonical-plan identity, foundation pinning, and incompatibility refusal remain tested.

Candidate generation now refuses these two integration shapes:

- `CategorySidebar → CatalogueWorkspace` changes state/control/layout semantics across the declaration;
- `ProductCardWithQuickView → ProductGrid` changes module setup, props, side effects, and a mapped expression.

The former Prompt 015 success depended on the removed weak declaration-ownership fallback. Retaining it would violate the corrected source-of-truth rule. Controlled tests now assert deterministic pre-mutation refusal and that candidate verification/runtime hooks are not invoked.

## 16. Commands, results, counts, and durations

Focused results completed before the full matrix:

- `npm run typecheck`: passed;
- focused candidate planner/failure tests: 23/23 passed in 148.63s;
- `npm run test:candidate-integration`: 4/4 passed in 84.54s;
- exact external E2E: 1/1 passed in 8.9m.

Final matrix:

- `npm run typecheck`: passed, 16.90s;
- `npm run test:instrumentation`: 10/10, 42.05s;
- `npm run test:preview-runtime`: 17/17, 16.51s;
- `npm run test:studio`: 119/119, 127.02s;
- `npm run test:source-analysis`: 16/16, 67.89s;
- `npm run test:feature-slice`: 5/5, 40.10s;
- `npm run test:test-slicing`: 12/12, 53.76s;
- `npm run test:candidate-generation`: 27/27, 158.24s;
- `npm run test:candidate-integration`: 4/4, 88.55s;
- `npm run fixture:verify`: passed, 5.74s;
- `npm run build`: 64 candidates validated, 52 modules built, 11.32s;
- `npm run test:e2e`: 42/42, 203.95s;
- `npm test`: 29 files passed, one explicitly gated external-control file skipped; 197 tests passed and 3 gated tests skipped, 513.24s;
- `git diff --check`: passed.

The first full browser pass exposed one stale success oracle in `local-canonical-plan.spec.ts`; the product correctly disabled candidate creation. That E2E was updated to assert the structured fallback-forbidden refusal, no declaration replacement, no candidate branch/worktree, and the same canonical plan identity. It passed alone and then in the full 42-test rerun. The exact external test separately executes the normally gated external oracle.

## 17. Documentation changes

The premature Prompt 015 PASS and claims of expression replacement or single-render-delta declaration ownership were removed. Documentation now states that unsupported region shapes deliberately refuse and that the controlled declaration-wide integrations are not currently candidate-generatable.

## 18. Remaining unsupported JSX shapes

Arbitrary conditional/logical/map expression merge, arbitrary JSX subtree diffing, attribute reconciliation, deletion projection, reordered children, multiple selected occurrences, multiple plausible parents/anchors, changed parent shells, changed surrounding declaration semantics, and declaration ownership inference remain unsupported.

## 19. No-repository-specific-hack assessment

Production logic contains no external/fixture path, component, feature, repository, or branch name. It uses generic Babel AST identities, exact Git blobs, structural hashes, server-owned evidence edges, and deterministic refusal. Repository-specific patches/selectors exist only in the external falsification oracle.

## 20. Final cleanup state

The root remains on `main` at `8d4cd1789f708e0ad688c233efa2b15bdbd0e27d` with only the intended uncommitted Prompt 014/015F changes. The root, controlled fixture, Prompt 014 historical checkout, and Prompt 015 external checkout have no generated candidate/preview worktrees. The external checkout is clean on `prompt014-foundation` and retains the inspectable corrected candidate branch. Controlled test candidate branches were removed. Ports 4310/4173/5173 and the checked preview range have no listeners; no Node process remains. Three tracked screenshots touched by Playwright were restored to their starting content.

## 21. Phase-0 verdict

**MODIFY**

The two correctness blockers are closed, and the unrelated external direct-child scenario remains fully green. PASS is not justified because the controlled CategorySidebar and Quick View declaration-wide integrations now correctly refuse and therefore do not complete candidate verification/runtime under the conservative contract.

## 22. Explicit confirmations

- no regex/text JSX merge;
- no LLM merge authority;
- no manual filenames;
- no dependency maps;
- no manual candidate edits;
- no unsafe declaration fallback;
- no weakened safety assertions;
- no commit;
- no push;
- no deploy.

## Prompt 015G historical addendum

Prompt 015G realigns the controlled fixture rather than changing this production boundary. Category Sidebar and Product Quick View now integrate through unique direct-child insertion into structurally unchanged parents, and the historical declaration-wide/expression-contained forms remain refusal tests. All controlled local generation, replay, verification, runtime, and acceptance scenarios pass. The overall verdict remains MODIFY only because the required external rerun could not start after the execution environment exhausted its approval quota; the prior Prompt 015F external pass is retained but not misreported as a fresh 015G result.
