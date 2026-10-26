# UMS-23 — Pinned external Vite rerun protocol

**State: prepared for an explicit owner opt-in; no fresh external rerun claimed.** The project-owned [manual GitHub Actions workflow](../.github/workflows/ums23-external-validation.yml) is deliberately triggered only by `workflow_dispatch`, not ordinary pushes or pull requests. Merely merging this workflow does not run or pass an external compatibility experiment.

## Why this experiment matters

The controlled Product Catalogue already exercises source-backed selection, dependency extraction, exact-foundation candidate generation, unrelated-change exclusion, browser behavior, idempotency, and refusal. One unrelated React/TypeScript/Vite application historically passed a corrected direct-child JSX integration test; this is not broad compatibility evidence. The prior external run predates later engine and UX changes. UMS-23 repeats the exact pinned external scenario on the then-current reviewed `main` without changing the integration grammar.

## Input contract

- External upstream: `https://github.com/larry-xue/react-admin-dashboard.git`
- Exact foundation: `8223897259151c450f954e462c57df3703d5508d`
- Two controlled, separate source branches: `prompt014-workspace-status` and `prompt014-revenue-pulse`
- Patches: `tests/external-vite/workspace-status.patch` and `tests/external-vite/revenue-pulse.patch`
- Worktree root: ignored `.validation-worktrees/prompt015-external-vite`, created inside a disposable runner
- Test: `npm run test:e2e:external`, configured by `apps/studio/playwright.external.config.ts`
- Generated candidate: `prompt015-external-candidate` (only inside the cloned disposable repository)

The preparation script refuses output paths outside the managed `.validation-worktrees` root, clones the upstream, checks out the pinned foundation, applies the tracked patches with fixed author dates, and ensures the resulting foundation checkout is clean. The workflow checks the foundation SHA before and after execution.

## Isolation and authorization

This test **executes third-party package-manager lifecycle and Vite/build code**. Even with a pinned foundation, external npm installation and verification are not sandboxed by Git worktrees. For UMS-23, execution is limited to a disposable GitHub-hosted Ubuntu runner with read-only repository permissions; checkout does not persist a GitHub token, no application/production secrets are passed, no production domain is touched, and no Vercel deployment/promotion is invoked by the workflow. The runner can access the network, and this isolation is not a security certificate.

**Do not invoke the workflow without a separate, explicit owner decision accepting the external code/network execution.** If the workflow file is still only on a PR branch, GitHub may require it to land on the default branch before manual dispatch is available. Enabling the workflow is not consent to execute it.

At dispatch time, select the protected `main` ref and provide the independently reverified **40-character exact `main` commit SHA** in the required `expected_sha` input. The workflow refuses mismatched SHAs before first-party dependency installation or external cloning, and the job is skipped for non-`main` refs. A workflow checkout is not a Git security sandbox, and validating the exact SHA does not substitute for reviewing workflow changes and upstream execution risk.

## Required PASS evidence

1. Workflow runs from the exact reviewed UI Merge `main` SHA with the pinned external foundation and both tracked patch branches. Record every SHA.
2. Real instrumented desktop browser previews launch; login succeeds; the two feature selections send opaque receipts and resolve to the expected source/AST evidence without browser-authored paths.
3. The plan has exactly two supported `insert-child` operations: `WorkspaceStatusBanner` in `PageContent`, and `RevenuePulseBadge` in `RevenueTrendChart`.
4. Source/dependency checks include required hook, config, component and style files, while excluding the unselected density-control sibling and the unrelated revenue-footer change.
5. A candidate is created only from the exact foundation; npm installation, ESLint, TypeScript-containing production build, and rendered runtime behavior all pass.
6. Replaying the same plan produces the same candidate commit/tree as an idempotent reuse.
7. Source diffs and running UI contain both selected features and neither unselected change; browser console asserts no unexpected errors.
8. The generated foundation repository remains clean; no extra managed Git worktree is left behind; tracked UI Merge files are unchanged.

**Failure is valid evidence, not a reason to disable assertions or widen integration.** Preserve the logs/failing input and classify source identity, ownership, dependency, projection, Git, verification, runtime, and cleanup failures separately. Do not automatically patch third-party upstream, rewrite fixtures to fit the engine, or claim an external PASS from TypeScript/build alone.

## Reporting / decision

Record workflow URL, exact runner commit, external source/foundation/branch/candidate/tree SHAs, precise test results, runtime assertions, excluded paths, replay and cleanup outcomes, and any unresolved limits under `docs/evaluation.md` only after inspecting the completed output. If it passes, the justified claim is **a fresh rerun of one bounded external scenario**. It does not prove arbitrary React branches, all Vite repositories, other package managers, or independent AI-generated UI composition.

After UMS-23, the next genuinely additive compatibility test is a **second unrelated React/Vite repository with application-owned tests**. Prefer an independently structured application and a pre-declared refusal case rather than a near-duplicate of this fixture.
