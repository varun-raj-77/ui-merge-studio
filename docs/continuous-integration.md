# Continuous integration

The [UI Merge Studio verification workflow](../.github/workflows/verify.yml) runs automatically on pull requests targeting `main` and pushes to `main`. It is intentionally read-only (`contents: read`), without repository write credentials, production smoke calls, or manual deployments.

## What it verifies

The workflow uses Ubuntu 24.04 and Node.js 24 to match the currently configured Vercel Node major version. From the committed lockfile it runs:

1. `npm ci --no-audit --no-fund`.
2. `npm run fixture:create` to generate a **disposable** controlled Git repository in the CI checkout (not in the original repository).
3. `npm run typecheck` and `npm test`.
4. `npm run fixture:verify` to assert controlled branch topology and relevant negative/inclusion/exclusion contracts.
5. `npm run showcase:validate` and `npm run build` to check the committed hosted evidence and bundle.
6. A bounded Chromium Playwright product-journey suite from four existing specs: `guided-experience.spec.ts` (hosted/local boundary and keyboard entry), `showcase-evidence.spec.ts` (desktop/mobile selection → combine → evidence, negative refusal and recovery), `integration-plan.spec.ts` (canonical plan identity, configured runtime, history, and non-matrix combinations), and `foundation-support.spec.ts` (pinned Main/A/B foundation semantics, incompatible-foundation refusal, mobile keyboard and undo). This is **13 tests** at the time of UMS-02; runner selection is by exact filename, not a wildcard that can accidentally include external tests.
7. **Controlled local-engine browser proof** via exact Playwright selectors `local-canonical-plan.spec.ts` and `local-selection-provenance.spec.ts`. Against the disposable, generated **project-owned** Product Catalogue Git fixture, these start real isolated branch previews, select rendered components, verify a canonical plan, generate and verify a Git candidate, exercise its live preview, and assert source/branch/worktree cleanup. The negative path rejects browser-forged source metadata and an unknown receipt before Git mutation. These tests run in CI only, never against production or external repositories.
8. Repeat `npm run fixture:verify` after both tests to confirm the fixture is still clean and satisfies all base/branch contracts.
9. `git diff --exit-code` to detect unexpected tracked-source modifications.

A green run proves only that these exact checks passed for the reported commit. It is **not** proof of arbitrary React repository support, external dependency isolation, other Playwright journeys outside the six explicitly named specs, a live deployment, arbitrary local-repository candidate generation, or production candidate generation.

## Deliberate exclusions

The `external:prepare` and `test:e2e:external` families are **not** part of automatic CI. They may clone/install/execute unrelated repositories and require separate review of network, lifecycle scripts, and isolation. The remaining local-engine/browser suite and external-adapter journeys are also **not** silently treated as covered by the two named controlled local proofs. Fixture-owned npm installation/build and local process execution are intentional and scoped to ephemeral CI worktrees; these checks do not isolate untrusted package lifecycle scripts or prove arbitrary-repository safety.

This workflow does not set GitHub branch protection or make checks mandatory for merging; that is a separate repository-policy decision. PR merge and production changes still require explicit authorization.
