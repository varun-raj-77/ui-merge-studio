# UMS-22 — Release-protection rollout (administrative handoff)

**State: proposed configuration, NOT an enabled protection policy.** This file and its regression tests do not configure GitHub rules, Vercel Deployment Checks, branch permissions or domains. No deployment, alias change, manual CI dispatch or side-effectful production test is authorized by this document.

**Read-only baseline, 22 October 2026:** Repository `varun-raj-77/ui-merge-studio`, GitHub `main` `cde58a7969f81f1ffb0881447b0fa1e515db0565` (UMS-21 post-merge). GitHub branch endpoint reported `protected: false`, `required_status_checks.enforcement_level: off`, and no required check contexts. The repository-level ruleset list was empty. The detailed branch-protection endpoint returned **403 Resource not accessible by integration**; this GitHub connection has no administration-write action. The existing exact-commit GitHub Actions check `Typecheck, tests, build, and browser journeys` has passed (source: [verify.yml](../.github/workflows/verify.yml); [UMS-21 post-merge run](https://github.com/varun-raj-77/ui-merge-studio/actions/runs/39843477977)). The Vercel production deployment was READY on the same commit with the canonical `ui-merge-studio.vercel.app` alias, but the available Vercel project-read action did **not** expose required Deployment Checks. **Their actual configuration and plan eligibility remain unverified.** Recheck everything immediately before activating a setting.

## Activation progress — 26 October 2026 (independently rechecked)

**GitHub branch gate: ACTIVATED, within the configured non-admin enforcement scope.** The live `main` branch endpoint now reports `protected: true`; required-check enforcement level is `non_admins`, and the sole required context is `Typecheck, tests, build, and browser journeys` from GitHub Actions (app ID 15368). The full workflow passed for PR #26 at `e59bc69bfdf4223294f29eef8711fcca72e3fc2b`. Administrators retain bypass capability; no claim of universal/no-bypass enforcement is justified. The detailed protection endpoint still returns 403 to this integration, so approval-count, up-to-date enforcement, and deletion/force-push controls should be cross-checked in the owner's settings UI rather than inferred from the brief branch API response.

**Vercel deployment check: CONFIGURATION ACCEPTED IN OWNER UI; RELEASE ENFORCEMENT NOT YET DEMONSTRATED.** On 23 October 2026 the owner selected the existing GitHub Actions check under Deployment Checks and Vercel displayed `New deployment checks will take effect on your next production deployment.` The connected project API does not expose the saved check list or its required/production scope. Owner UI readback remains necessary; no new production deployment has exercised the rule. Vercel documentation says a workflow triggered by ordinary `push`/`pull_request` may provide its GitHub check directly without adding the `repository_dispatch` status action; that action is needed for workflows triggered by `repository_dispatch` events.

**PR #26 release gate: STILL BLOCKED.** The scoped draft PR is unmerged. Its GitHub Actions check has passed, but its Vercel status is `failure` with the build-rate-limit link, and no READY exact-head preview deployment was found. Do not represent PR #26 as preview-verified or use Force Promote, a manual deployment, or production traffic to bypass this condition. This status update is documentary, not proof of release-gate success.

## Goal and non-goals

**Goal:** Block an untested direct GitHub `main` change, and—if Vercel offers GitHub-backed required Deployment Checks for this project—hold production-domain assignment for each new production build until its exact-commit GitHub Actions job has completed successfully.

**Non-goals:** Replace Vercel Git integration, introduce GitHub Actions deployment credentials, manually deploy or promote, run tests against live production, demand a second human GitHub reviewer when none is available, or claim that a static unit test enforces remote settings.

## Phase A — GitHub: owner/admin-controlled activation (FIRST)

Open [GitHub repository settings → Branches](https://github.com/varun-raj-77/ui-merge-studio/settings/branches) or [Rules → Rulesets](https://github.com/varun-raj-77/ui-merge-studio/settings/rules). The available connector cannot create/edit either protection; **the repository admin must perform and confirm the following settings**:

| Control | Proposed initial value | Reason |
|---|---|---|
| Target | `main` only | Preserve normal draft PR/preview workflow |
| Require a pull request before merging | **ON** | Prevent direct unreviewed pushes to the default branch |
| Minimum approving reviews | **0 initially** | Maintain solo-owner operation; change only after an available reviewer is confirmed |
| Require status checks to pass | **ON** | GitHub enforces the existing full CI gate |
| Exact required check | `Typecheck, tests, build, and browser journeys` | This is the **GitHub Actions job name**, not the workflow title, Vercel Preview Comments or a fabricated status |
| Check source | **GitHub Actions**, if offered by the settings UI | Avoid accepting an unrelated source spoofing the same check name |
| Require branch up-to-date before merging | **ON** for strict safety, after verifying ordinary PRs can refresh/re-run; preserve the owner's exact-head approval rule | If the base moves, refresh and reapprove the new HEAD rather than merging stale evidence |
| Force pushes and deletion | **OFF** | Protect history and the default branch |
| Required deployments / merge queue / linear history / signed commits | **OFF initially** | Do not introduce extra status contexts or break existing GitHub merge-commit workflow |
| Apply restrictions to administrators / prevent bypass | **Enable after checking that a normal exact-head approved PR can merge** | Avoid accidentally blocking the only maintainer before a recovery path exists |

Save, then **read back** protection status from the GitHub UI. Confirm a normal PR targeting `main` shows the required GitHub Actions check; **do not assume this repository file enabled anything**. For a genuinely required check, the context must have run recently and its source name must be correct. Existing `verify.yml` runs on every PR targeting `main` and every push to `main`, with no path filters.

For protected-branch GitHub documentation, see [managing branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule) and [troubleshooting required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).

## Phase B — Vercel: production-domain gating (ONLY after Phase A)

Open [Vercel UI Merge Studio project settings](https://vercel.com/dashboard), choose the `ui-merge-studio` project and use **Settings → Deployment Checks / Add Checks** (exact navigation may vary). Check project/team plan availability and that Git integration links to **`varun-raj-77/ui-merge-studio`** with `main` as the production branch; keep **automatic domain assignment enabled**.

1. If the interface supports GitHub-backed required checks, select the existing **GitHub Actions** check named exactly `Typecheck, tests, build, and browser journeys` as a **required** production check. This checks the new production **merge commit**, not merely the PR head.
2. Preserve Vercel's Git-based build and production aliasing. **Do not** add a second GitHub Actions production deploy job, CLI token, live browser smoke, `repository_dispatch` workflow, branch migration or manually triggered deploy.
3. Verify the requirement is saved and visible in the project settings. If the required-check option is unavailable, record the limitation; **do not replace it with a non-blocking check or falsely declare the gate enforced**.
4. **Do not use Force Promote** to bypass a failed or pending required check without a distinct, explicit emergency authorization. Existing known-good production should remain served while a new deployment is blocked.

Vercel reference: [Deployment Checks](https://vercel.com/docs/deployment-checks).

## Phase C — independently validate effective configuration

**Read-only prerequisites:** Confirm `main.protected === true` and a required GitHub Actions check with the exact context above; confirm ruleset/branch source and bypass policy; confirm the Vercel **required** check is present. If any cannot be read through the connected tools, request an owner-provided settings view instead of treating the absence of data as an OFF setting.

**Non-destructive validation:** After separate exact-SHA approval of a future normal PR, verify merge checks pass at the approved SHA. Observe the new Vercel production deployment and required check's **pending → success** transition; confirm the canonical domain follows only once the gate passes. Verify the independent post-merge GitHub Actions run at the resulting merge commit. Inspect logs and alias via the existing connected read-only operations.

**Failure-path proof requires another explicit approval.** Do not inject a failing GitHub check onto `main`, bypass requirements, intentionally break production, manually redeploy or force promote solely to demonstrate a denied release. Use a reviewed safe test plan with a rollback and ownership decision if deeper validation is required.

**Success definition:** Protected `main`; correct required job/source; no unapproved bypass; Vercel required check configured for the production environment and verified to block an unverified new deployment; exact-commit CI/alias evidence. **A green PR plus a READY preview alone does not satisfy this definition.**

## Operational recovery / lockout safeguards

- If a branch rule unintentionally blocks all maintainers, use GitHub's **administrative settings** to correct that rule; do not force-push or merge without exact-head verification. Require a separately authorized exception for any deliberate bypass.
- If a deployment check is stuck pending because CI was cancelled by the same-ref concurrency setting, inspect the latest run for the **exact production commit**. Do not use a prior PR's success as evidence of the merge commit's post-merge CI. Correct the check configuration or CI issue before release.
- If a required check is renamed, update the GitHub and Vercel settings in a reviewed, coordinated change; the [release-policy regression](../tests/studio/releaseProtectionContract.test.ts) intentionally prevents accidental renaming without review.
- Repository workflow `contents: read`, immutable actions and `persist-credentials: false` must stay in place; do not add production credentials to untrusted PR checks.

## Status handoff

| Gate | Recorded state before activation | Proof after activation |
|---|---|---|
| GitHub PR required | **OFF / `main` unprotected** | Admin readback + check required for a fresh normal PR |
| GitHub required CI job | **OFF** | Exact name and GitHub Actions source enforced |
| GitHub rulesets | **None returned** | New effective rule visible, or protected branch readback |
| Vercel Deployment Checks | **UNKNOWN (not readable here)** | Owner/admin settings show check is required for production |
| Production domain | **READY**, UMS-21 `cde58a7969f81f1ffb0881447b0fa1e515db0565` at time of inspection | Subsequent verified deployment auto-assigned only after passing checks |

Do not mark UMS-22 as **enforced** until the effective settings, not just this PR, are verified.
