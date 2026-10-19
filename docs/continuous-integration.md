# Continuous integration

The [UI Merge Studio verification workflow](../.github/workflows/verify.yml) runs automatically on pull requests targeting `main` and pushes to `main`. It is intentionally read-only (`contents: read`), without repository write credentials, production smoke calls, or manual deployments.

## What it verifies

The workflow uses Ubuntu 24.04 and Node.js 24 to match the currently configured Vercel Node major version. From the committed lockfile it runs:

1. `npm ci --no-audit --no-fund`.
2. `npm run fixture:create` to generate a **disposable** controlled Git repository in the CI checkout (not in the original repository).
3. `npm run typecheck` and `npm test`.
4. `npm run fixture:verify` to assert controlled branch topology and relevant negative/inclusion/exclusion contracts.
5. `npm run showcase:validate` and `npm run build` to check the committed hosted evidence and bundle.
6. A Chromium Playwright smoke test limited to `tests/e2e/guided-experience.spec.ts` for the hosted/local boundary and keyboard/mobile entry journey.
7. `git diff --exit-code` to detect unexpected tracked-source modifications.

A green run proves only that these exact checks passed for the reported commit. It is **not** proof of arbitrary React repository support, external dependency isolation, all Playwright journeys, a live deployment, or production candidate generation.

## Deliberate exclusions

The `external:prepare` and `test:e2e:external` families are **not** part of automatic CI. They may clone/install/execute unrelated repositories and require separate review of network, lifecycle scripts, and isolation. The complete local engine browser suite is also not silently treated as covered by the bounded hosted-boundary smoke.

This workflow does not set GitHub branch protection or make checks mandatory for merging; that is a separate repository-policy decision. PR merge and production changes still require explicit authorization.
