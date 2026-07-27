# Prompt 008 completion report

## 1. Final verdict

**PASS**

One unrelated React/TypeScript/Vite repository completed the full causal path from two rendered selections to a deterministic, dependency-aware, verified candidate branch. The result was not produced by merge, cherry-pick, branch-name rules, a manual file list, or LLM-authored integration. A real competing edit to the same declaration was also refused before mutation.

This is a bounded external proof, not universal Vite or React support.

## 2. What was actually proven

- **External rendered selection:** two real applications ran from separate worktrees and ports. The browser selected “Validation workspace” and “Validated revenue outlook.”
- **Source mapping:** runtime instrumentation resolved `PageContent` at `src/components/layout/contentbar.tsx:26:7` on `b41a356` and `RevenueTrendChart` at `src/views/dashboard/index.tsx:27:7` on `98e02f6`.
- **Dependency slicing:** each selected declaration pulled one direct and one transitive added module. No styles, assets, types, or changed test units were required by these two slices.
- **Candidate planning:** read-only preflight planned exactly six paths from base `8223897`; no candidate ref or candidate worktree existed before acceptance.
- **Candidate generation:** `ui-merge-validation-combined` is commit `f294a4f`, parented directly by `8223897`, with tree `1d0165457f9471908539f6660f17574b1f89dfe8`.
- **Unrelated-change exclusion:** `headerbar.tsx` and `layout/index.tsx` were identified as branch changes but excluded.
- **Verification:** install, TypeScript project build, lint, production build, runtime launch, and the focused Playwright journey passed. The external package has no test script or test files, so no nonexistent external test suite was claimed.
- **Determinism:** a second identical generation recognized the existing candidate as idempotent and reported the same commit and tree.
- **Cleanup:** preview sessions reached zero; temporary candidate/preview worktrees were removed; managed ports were free.
- **Refusal:** `b41a356` and alternate commit `db35e24` reconstruct `PageContent` differently. Preflight reported an `overlapping-declaration` conflict and created neither `ui-merge-validation-conflict-refusal` nor a worktree.

## 3. What remains unproven

- Other Vite layouts, package managers, routers, aliases, CSS ownership models, test frameworks, and monorepos.
- Dynamic imports, HOCs, render props, class components, CSS-in-JS, non-relative aliases, deletions, and arbitrary side effects.
- Meaningful test slicing on this external repository; it contains no test suite.
- Concurrent users, hostile repositories, long-running services, remote repositories, cloud execution, Next.js, and FlowCraft.
- Performance on large dependency graphs and resilience to machine crashes during worktree/process activity.

## 4. Initial repository state

### UI Merge Studio

- Branch `main`, commit `e7b1b48baacfa8ffe3ccd3bd1091b6f6016fbccf`.
- Clean status; one registered worktree; published `origin` present.
- Expected ports `4310`, `5173`, `5174`, and `5175` had no listeners.
- Work moved to `codex/external-vite-candidate-generation` before editing.

### External repository

- Branch `main`, commit `8223897259151c450f954e462c57df3703d5508d`.
- Clean status and one registered worktree.
- Original refs: left `3cecf706ae8c3ac2d3bc7f336b303b02a01d134f`; right `64496eb0eeb19ae3fd3db94cf304cee654cd2605`.
- Both original merge bases were exactly `8223897`; neither had sufficient dependency structure for an honest candidate-generation proof.
- No candidate ref, stale worktree, or managed preview listener existed.

## 5. Final repository state

### UI Merge Studio

- Branch `codex/external-vite-candidate-generation`, based on `e7b1b48`.
- Working tree contains only the intentional Prompt 008 implementation, tests, evidence, and documentation listed below. It is intentionally uncommitted pending review.
- One registered repository worktree; no managed preview sessions or listeners.

### External repository

- Original checkout remains clean on `main` at `8223897`; one registered worktree.
- Original left and right refs remain exactly `3cecf70` and `64496eb`.
- Bounded descendants: left `b41a356`, right `98e02f6`; failure fixture `db35e24`.
- Candidate: `ui-merge-validation-combined` at `f294a4f`; parent `8223897`; tree `1d0165457f9471908539f6660f17574b1f89dfe8`.
- No temporary paths, candidate worktrees, source worktrees, or running preview processes remain.

## 6. Files changed

### Product implementation

- `apps/studio/repositoryConfig.ts` — bounded environment configuration for local repository, refs, route, candidate name, and deterministic verification commands.
- `apps/studio/server.ts` — consumes that configuration and passes real verification commands to generation.
- `apps/studio/src/App.tsx` — uses configured source/candidate refs in result switching and reports actual included/excluded evidence.
- `packages/candidate-generation/src/candidateGenerator.ts` — exports the verification-command contract and reconstructs typed arrow components from their complete variable-declaration boundary.

### Tests

- `tests/preview-runtime/repositoryConfiguration.test.ts` — defaults, external configuration, malformed command refusal.
- `tests/candidate-generation/externalViteCandidate.test.ts` — dependency inclusion, exclusion, exact-base planning, stale evidence, and real declaration-conflict refusal.
- `tests/candidate-generation/candidateFailure.test.ts` — arrow-function declaration-boundary regression.
- `tests/e2e/external-vite-candidate.spec.ts` — complete browser selection/generation/idempotence/relaunch/cleanup journey.

### External validation fixtures

- Left descendant: modified `contentbar.tsx`, added `validationWorkspace.ts` and transitive `validationWorkspaceConfig.ts`, plus unrelated `headerbar.tsx`.
- Right descendant: modified dashboard `index.tsx`, added `revenueOutlook.ts` and transitive `revenueOutlookConfig.ts`, plus unrelated layout `index.tsx`.
- Alternate refusal branch: one competing visible line inside `PageContent` in `contentbar.tsx`.
- Original `ui-merge-validation-left` and `ui-merge-validation-right` were not modified.

### Evidence and documentation

- Five bounded PNGs under `docs/evidence/prompt-008/`.
- This report, exact prompt copy, and updates to README, evaluation, decision log, risk register, and limitations.

## 7. Candidate provenance

| Candidate path | Source | Proven reason | Ownership |
| --- | --- | --- | --- |
| `src/components/layout/contentbar.tsx` | `b41a356` | Selected `PageContent` | declaration reconstruction plus required import |
| `src/components/layout/validationWorkspace.ts` | `b41a356` | direct dependency of selected declaration | fully owned added file |
| `src/components/layout/validationWorkspaceConfig.ts` | `b41a356` | transitive dependency | fully owned added file |
| `src/views/dashboard/index.tsx` | `98e02f6` | Selected `RevenueTrendChart` | declaration reconstruction plus required import |
| `src/views/dashboard/revenueOutlook.ts` | `98e02f6` | direct dependency of selected declaration | fully owned added file |
| `src/views/dashboard/revenueOutlookConfig.ts` | `98e02f6` | transitive dependency | fully owned added file |

Explicitly excluded: left `src/components/layout/headerbar.tsx` (“Left preview note”) and right `src/components/layout/index.tsx` (“Right preview note”). Neither appears in the candidate diff or combined runtime.

## 8. Important commands executed

```powershell
git status --short
git branch --show-current
git log -5 --oneline
git remote -v
git worktree list
git switch -c codex/external-vite-candidate-generation

git -C "C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation" branch -vv
git -C "C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation" log --oneline --decorate --graph --all -20
git -C "C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation" merge-base main ui-merge-validation-left
git -C "C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation" merge-base main ui-merge-validation-right
git -C "C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation" diff --stat main...ui-merge-validation-left
git -C "C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation" diff --stat main...ui-merge-validation-right

npm run typecheck
npm run build
npm run fixture:verify
npm test -- --reporter=verbose
npx vitest run tests/candidate-generation/externalViteCandidate.test.ts --reporter=verbose
npx playwright test -c apps/studio/playwright.config.ts tests/e2e/external-vite-candidate.spec.ts
```

The external candidate verification ran these exact configured subprocesses:

```powershell
npm ci --no-audit --no-fund
npm exec tsc -- -b
npm run lint
npm run build
```

## 9. Test and verification results

- UI Merge Studio typecheck: PASS.
- UI Merge Studio production build: PASS.
- Full Vitest: **90 passed, 3 external environment-gated tests skipped**; no failures.
- External integration Vitest with repository configured: **3 passed**.
- Controlled fixture contract: PASS.
- Focused external Playwright: **1 passed** in 6.2 minutes.
- External install/typecheck/lint/build in candidate worktree: all PASS.
- External tests: no `test` script or test files exist; this is a validation limitation, not a pass claim.
- Runtime: both selected features and baseline “Total Customers” rendered; unrelated notes were absent; no relevant console errors occurred. Existing Ant Design deprecation warnings remain.
- Determinism: second run was idempotent at candidate `f294a4f`, tree `1d0165457f9471908539f6660f17574b1f89dfe8`.

## 10. Architecture decisions

- Configuration is environment-driven and generic; no repository onboarding system was added.
- Production logic receives refs, route, and commands—not component names, labels, expected paths, branch semantics, or commit messages.
- Runtime identities seed Git/AST analysis. Tests mention `PageContent` and `RevenueTrendChart` only as assertions after generic resolution.
- Preflight is read-only. Generation starts from a detached exact-base worktree and registers a one-parent candidate ref only after verification.
- Modified modules are reconstructed by declaration identity; fully owned added dependency modules are added as whole files.
- Broad merge, cherry-pick, whole-branch patching, and manual candidate editing were rejected.
- The discovered variable-declarator/source-statement range mismatch was fixed generically and covered by a controlled regression.

## 11. Assumptions

- The local external repository and its pinned refs are trusted validation inputs.
- `npm exec tsc -- -b`, lint, and build are the best available repository-native gates because the package declares no tests.
- The two added dependency chains are representative only of conventional relative static imports.
- Existing Ant Design deprecation warnings are baseline library warnings, not candidate regressions.

## 12. Limitations and unresolved risks

- The validation branches were deliberately enriched because the original changes were three-line literals. They are bounded but still purpose-built fixtures inside a real unrelated application.
- Both dependency graphs are shallow, static, relative, and fully added; modified shared dependencies and complex test ownership remain harder.
- No external tests existed, so behavior is covered by browser assertions rather than an application-owned test suite.
- The focused E2E is slow because each isolated worktree performs a locked install.
- Static analysis can produce false negatives for dynamic language patterns and must refuse; false positives remain possible where source ownership looks static but runtime behavior is indirect.
- Candidate formatting is deterministic but not intended as a general formatter.
- Windows process-tree and worktree cleanup passed normally, but abrupt machine termination can leave resources requiring `git worktree prune`.
- Local execution is not a security sandbox for untrusted repositories.

## 13. Manual verification

From the UI Merge Studio repository:

```powershell
$env:UI_MERGE_REPOSITORY_PATH='C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation'
$env:UI_MERGE_BASE_REF='main'
$env:UI_MERGE_LEFT_BRANCH='ui-merge-validation-left-deps'
$env:UI_MERGE_RIGHT_BRANCH='ui-merge-validation-right-deps'
$env:UI_MERGE_CANDIDATE_BRANCH='ui-merge-validation-combined'
$env:UI_MERGE_PREVIEW_ROUTE='/auth/login'
$runner=$env:ComSpec
$commands=@(
  @{name='install';executable=$runner;args=@('/d','/s','/c','npm ci --no-audit --no-fund')},
  @{name='typecheck';executable=$runner;args=@('/d','/s','/c','npm exec tsc -- -b')},
  @{name='lint';executable=$runner;args=@('/d','/s','/c','npm run lint')},
  @{name='production-build';executable=$runner;args=@('/d','/s','/c','npm run build')}
)
$env:UI_MERGE_VERIFICATION_COMMANDS=$commands | ConvertTo-Json -Compress
npm run dev
```

Open `http://127.0.0.1:4310`, choose the demo, log into both embedded apps, select “Validation workspace” on the left and “Validated revenue outlook” on the right, inspect technical evidence, confirm both selections, review the ready plan, create the verified branch, then open the combined app. Verify both labels, baseline dashboard content, and absence of both preview notes.

Run the automated refusal with:

```powershell
$env:UI_MERGE_EXTERNAL_REPOSITORY='C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation'
npx vitest run tests/candidate-generation/externalViteCandidate.test.ts -t "refuses incompatible edits"
```

Cleanup and audit:

```powershell
git -C "C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation" worktree list
git -C "C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation" status --short
Get-NetTCPConnection -State Listen -LocalPort 4310,5173,5174,5175 -ErrorAction SilentlyContinue
```

## 14. Commit recommendation

No UI Merge Studio commit or push was made. After review, use three commits:

1. `fix: generalize external Vite candidate reconstruction` — product implementation and repository configuration.
2. `test: prove external Vite candidate generation` — unit/integration/E2E tests and five screenshots.
3. `docs: record external candidate generation proof` — prompt copy, this report, README, evaluation, decision log, risks, and limitations.

The three external validation commits already exist because immutable refs were required: `b41a356`, `98e02f6`, and `db35e24`. Do not push any repository without explicit instruction.

## Final review questions

- **What has actually been proven?** Two rendered selections in one unrelated Vite app constrained an exact-base, dependency-aware, verified, deterministic six-file candidate.
- **What remains assumed?** Generality beyond this syntax, repository scale, non-static dependencies, and application-owned tests.
- **What is fake, hard-coded, or validation-specific?** Expected names/paths are test assertions; the enriched branch changes and labels are validation fixtures. Production mapping and planning do not contain them.
- **What would a sceptical senior engineer challenge?** Shallow static dependencies, no external test suite, slow installs, local-process safety, and the small sample of repository structures.
- **What would a recruiter understand within five seconds?** Pick two live UI changes; the tool traces their code, combines only required dependencies, verifies the result, and refuses conflicts.
- **Does UI Merge Studio still deserve flagship status?** Yes as a rigorous local engineering prototype with honest bounded claims, not as production-ready universal merge automation.
- **What is the smallest next experiment?** Repeat the same proof on a second unrelated Vite repository that already has tests and includes one modified shared dependency or stylesheet.
