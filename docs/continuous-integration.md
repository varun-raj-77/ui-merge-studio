# Continuous integration

The [UI Merge Studio verification workflow](../.github/workflows/verify.yml) runs automatically on pull requests targeting `main` and pushes to `main`. It is intentionally read-only (`contents: read`), without repository write credentials, production smoke calls, or manual deployments.

## What it verifies

The workflow uses Ubuntu 24.04 and Node.js 24 to match the currently configured Vercel Node major version. GitHub-hosted checkout and Node setup actions use reviewed, immutable Node.js 24-compatible action commits, and checkout does not persist GitHub credentials into the working repository. The explicitly configured npm cache is preserved.

Chromium installation uses the pinned Playwright version from the committed lockfile, including OS dependencies (`--with-deps`). UMS-17's completed CI required 10m55s for this stage; it may depend on Linux package mirrors and browser download availability. The step now prints the Playwright version, reports its elapsed installation time and has an independent 20-minute timeout. **This adds visibility and a failure bound, not a measured speed improvement or browser-cache guarantee.** Existing browser suites, browser assertion coverage, and the overall 40-minute job timeout are unchanged.

The workflow uses same-ref concurrency cancellation (`cancel-in-progress: true`): if GitHub schedules a second run for the same branch/commit, the earlier run may show Cancelled. Evaluate the latest completed run for the exact SHA; do not treat an older cancelled run as a product failure or as proof that the latest run succeeded.

**Deployment ordering:** Vercel Git integration may publish a successful build from `main` before this independent GitHub Actions workflow finishes. A Vercel `READY` state and matching production alias prove deployment alignment, **not** a passed post-merge test suite. The existing workflow does not enforce required GitHub checks or Vercel Deployment Checks. Release verification therefore requires checking the successful *post-merge workflow* at the exact production commit separately; enforcing pre-production deployment gating is an open repository/platform configuration decision, not implemented by this document.

From the committed lockfile the workflow runs:

1. `npm ci --no-audit --no-fund`.
2. `npm run fixture:create` to generate a **disposable** controlled Git repository in the CI checkout (not in the original repository).
3. `npm run typecheck` and `npm test`.
4. `npm run fixture:verify` to assert controlled branch topology and relevant negative/inclusion/exclusion contracts.
5. `npm run showcase:validate` and `npm run build` to check the committed hosted evidence and bundle.
6. A bounded Chromium Playwright product-journey suite from four existing specs: `guided-experience.spec.ts` (hosted/local boundary and keyboard entry), `showcase-evidence.spec.ts` (desktop/mobile selection → combine → evidence, negative refusal and recovery), `integration-plan.spec.ts` (canonical plan identity, configured runtime, history, and non-matrix combinations), and `foundation-support.spec.ts` (pinned Main/A/B foundation semantics, incompatible-foundation refusal, mobile keyboard and undo). These are four explicit Showcase specs; the verified UMS-20 workflow (22 October 2026, run #39839555057) passed **14 Showcase browser tests**. The count is a dated result, not a permanent assertion; CI selects exact filenames rather than a wildcard that could silently include external tests.
7. **Controlled local-engine browser proof** via exact Playwright selectors `local-canonical-plan.spec.ts` and `local-selection-provenance.spec.ts`. Against the disposable, generated **project-owned** Product Catalogue Git fixture, these start real isolated branch previews, select rendered components, verify a canonical plan, generate and verify a Git candidate, exercise its live preview, and assert source/branch/worktree cleanup. The negative path rejects browser-forged source metadata and an unknown receipt before Git mutation. These tests run in CI only, never against production or external repositories.
8. **UMS-09 real browser candidate proof:** execute `two-feature-candidate-browser.spec.ts` in the already installed CI Chromium. It synthesizes two project-owned React/Vite feature branches, selects them through the trusted authority, verifies the candidate with real TypeScript and Vite build tools, starts a temporary Vite server in the verified candidate worktree, and checks both features render and survive browser reload without page errors or unrelated source. Worktree, server, and fixtures are removed after testing; this is **not** an external repository or live production journey.
9. Repeat `npm run fixture:verify` after browser tests to confirm the fixture is still clean and satisfies all base/branch contracts.
10. `git diff --exit-code` to detect unexpected tracked-source modifications.

A green run proves only that these exact checks passed for the reported commit. It is **not** proof of arbitrary React repository support, external dependency isolation, other Playwright journeys outside the seven explicitly named specs, a live deployment, arbitrary local-repository candidate generation, or production candidate generation.

## Deliberate exclusions

The `external:prepare` and `test:e2e:external` families are **not** part of automatic CI. They may clone/install/execute unrelated repositories and require separate review of network, lifecycle scripts, and isolation. The remaining local-engine/browser suite and external-adapter journeys are also **not** silently treated as covered by the two named controlled local proofs. Fixture-owned npm installation/build and local process execution are intentional and scoped to ephemeral CI worktrees; these checks do not isolate untrusted package lifecycle scripts or prove arbitrary-repository safety.

This workflow does not set GitHub branch protection or make checks mandatory for merging; that is a separate repository-policy decision. PR merge and production changes still require explicit authorization. See the [UMS-21 readiness audit](product-readiness-audit.md) for the evidence and launch-claim gates.
