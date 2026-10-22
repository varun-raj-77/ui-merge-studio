# UMS-21 — Product readiness and engineering audit

**Evidence snapshot:** 22 October 2026, GitHub `main` at `31bb44627de38d71c2bbf9b9ccfe76c9f09e47c8` (UMS-20); latest independently verified post-merge [GitHub Actions #39839555057](https://github.com/varun-raj-77/ui-merge-studio/actions/runs/39839555057); production [Vercel deployment](https://ui-merge-studio.vercel.app/) at the same SHA was READY with canonical alias. This is a **read-only audit of existing evidence** followed by documentation/test-only changes. No new external repository was executed, production smoke performed, runtime capability added, platform policy changed, or product security certified.

## Executive decision

- **Hosted controlled Showcase: ready to demonstrate publicly**, subject to clear recording/fixture labels. Vercel production has deployed and CI checked the exact main commit; only committed, controlled preview/evidence can be shown on the hosted site. **Do not** describe this as hosted Git candidate generation.
- **Local proof-of-concept: suitable for trusted developer evaluation within documented constraints.** The first-party fixture and a bounded synthesized React/TypeScript/Vite repository have actual candidate/provenance/browser verification. Outcomes are scoped to selected source structures and configured verification checks. This does **not** establish arbitrary repository safety or correctness.
- **General-purpose merge product / arbitrary repositories / security-hardened multi-user SaaS: NOT READY / NOT PROVEN.** No blanket compatibility, remote execution, untrusted-code isolation, GitHub PR automation, or autonomous merge claims should be made.

A passing check proves only its configured assertions in the specific commit/fixture. Candidate generation means creating a **local verified Git branch**, not pushing, opening a PR, merging or deploying it.

## Capability and claim matrix

| Surface or capability | Observed support / evidence | Permitted wording | Boundary / missing proof |
|---|---|---|---|
| Public hosted Product Catalogue | [Showcase evidence](evidence/showcase/latest/run-report.json), [manifest validation](../scripts/validate-showcase.ts), fixed browser journeys in [CI](../.github/workflows/verify.yml) | Interactive controlled Showcase of selection, configuration, replay, explicit refusals and recorded evidence | Hosted browser cannot inspect visitor repositories or perform Git, analysis, worktrees or builds |
| Local repository discovery | [Discovery](../packages/repository-controller/src/repositoryDiscovery.ts), tests under `tests/repository-controller/` | Discovers **root-level Git** React + TypeScript + Vite projects with required scripts/entry points; local candidate preflight separately requires a clean worktree and refuses unsupported/stale evidence | Next.js, arbitrary monorepos, cloud repositories and framework-independent source understanding unsupported |
| Local previews | [Preview controller](../packages/preview-runtime/src/previewController.ts), local tests and [limitations](limitations.md) | Runs supported Vite branches in detached worktrees with recorded process and session lifecycle | npm actual install/launch tested; pnpm/yarn command resolution exists but real installation/launch paths lack matching proof; installs are **not sandboxes** |
| Source selection / provenance | [Source analysis](../packages/source-analysis/src/featureSliceAnalyzer.ts), [local authority](../apps/studio/localPlanAuthority.ts) and browser tests | Browser selects supported instrumented React boundaries; server derives exact current plan and pinned source identity | Opaque selection receipts protect the normal trusted-local workflow, **not** deliberate browser-process forgery or universal DOM ownership |
| Local candidate generation | [Generator](../packages/candidate-generation/src/candidateGenerator.ts), [local browser proofs](../tests/e2e/local-canonical-plan.spec.ts) and [two-feature proof](../tests/e2e/two-feature-candidate-browser.spec.ts) | One/two supported feature selections can produce a verified **local** candidate branch; ambiguous/unsafe cases explicitly refuse | Structural direct-child JSX projection and disjoint operation ownership are bounded; same-file cross-slice composition, complex dynamic patterns and arbitrary merges not established |
| Foundation plans | [Integration-plan tests](../tests/e2e/integration-plan.spec.ts), [foundation tests](../tests/e2e/foundation-support.spec.ts) | Main / Version A / Version B pinned foundation choices are proven in controlled adapter | Full foundation inclusion differs from a picked feature; real multi-route and external foundation cases remain unverified |
| Progress / recovery / handoff | [Progress tracker](../apps/studio/candidateProgress.ts), [UI](../apps/studio/src/CandidatePanel.tsx), [handoff](../apps/studio/src/candidateHandoff.ts) | Plan and generation evidence is fenced; verified local candidate metadata can be copied without raw logs or paths | Status is a last-attempt snapshot, not persistent job history; copy does not publish branch; no multi-user authorization |
| One unrelated Vite repository | [Evaluation](evaluation.md), [README](../README.md#unrelated-reactvite-validation) | A **single bounded external shape** was demonstrated historically, with safe JSX projection and unrelated-change exclusion | No app-owned test script; latest exact rerun still outstanding; cannot generalize to arbitrary Vite repositories |
| Automated checks | [Read-only workflow](../.github/workflows/verify.yml), [CI guide](continuous-integration.md) | At UMS-20: successful TypeScript, unit/integration, 14 Showcase browser journeys, 2 controlled local plan/provenance journeys and 1 two-feature candidate journey (**17/17 Chromium**) | CI excludes opt-in external test families, untrusted repositories, other browsers, macOS/Windows proof, and live production traffic |
| Deployment | [Vercel production](https://ui-merge-studio.vercel.app/) and exact GitHub main workflow | Hosted Showcase is automatically deployed and canonical alias verified at the UMS-20 SHA | READY does not imply post-merge CI passed. Branch protection, mandatory checks and Vercel Deployment Checks are **not established/enforced by current workflow** |

## Prioritized remaining risks and next evidence gates

| Priority | Gap and impact | Evidence necessary to change the claim | Suggested next milestone / owner decision |
|---|---|---|---|
| **P0 — release policy** | Vercel may deploy a `main` push **before** separate GitHub post-merge CI succeeds; PR approval process is presently procedural rather than verified branch rules | Read-only inspection of GitHub rulesets/branch protection and Vercel Deployment Checks; proposed enforced release policy reviewed for impact, then *separately authorized* changes and failure-path validation | **UMS-22:** release-policy design/review first. Do not change production settings in this audit |
| **P0 — compatibility claims** | One unrelated Vite candidate proof has no app-owned tests; later exact rerun is outstanding | Reproduce pinned external case against current HEAD in disposable sandbox with installation/network/lifecycle consent; capture Git diffs, checks, runtime behavior, exclusions and cleanup; a second unrelated app with meaningful tests | **UMS-23/24:** opt-in external evidence, no claims until passed |
| **P1 — untrusted code** | Repository package installation may execute lifecycle scripts with host rights; detached worktree is not a security sandbox | Document and validate a trust boundary/isolated executor with reviewed threat model, filesystem/network/process isolation and cleanup/failure evidence | Later security-execution milestone; no arbitrary-repository SaaS claim |
| **P1 — functional breadth** | Strict JSX AST insert-child, shared-file ownership, static context and primary-route assumptions | Negative and positive test fixtures for same-file region composition, multi-route ownership, dynamic syntax/aliases, CSS and package managers; refuse until each proves safe | Incremental, separate capabilities only |
| **P1 — lifecycle/operations** | Latest-attempt status is not durable or multi-tenant; UI abort does not cancel server Git operations | Per-job state persistence, authenticated ownership, cancellation semantics, parallel tab/process and restart tests | Only if multi-user/remote mode becomes a product goal |
| **P2 — presentation integrity** | Browser-verified fixture evidence and local capabilities can be conflated in public descriptions | Consistent hosted/local labels, explicit supported-profile boundaries, README/docs consistency regression | Maintain the audit claim tests introduced in UMS-21 |

## Public wording gate

**Safe:** “UI Merge Studio provides an interactive, controlled Showcase and a local experimental React/TypeScript/Vite workflow that can create verified candidate Git branches for supported feature selections, with explicit refusals when evidence is insufficient.”

**Not supported:** “Automatically merges arbitrary React apps”, “works with all package managers”, “fully secure code sandbox”, “deploys your integrated application”, “hosted Git branch generation”, “production-ready collaboration platform”, or “verified on arbitrary external repositories”.

## Definition of done for this audit

1. Read actual `main` evidence, CI selectors, repo discovery, engine status and limitations; distinguish observed result from extrapolation.
2. Record clear GO/NO-GO labels and prioritized gaps with concrete evidence needed to close each.
3. Reconcile the CI documentation's historical browser counts and explicitly note deployment/CI ordering.
4. Add a small regression guard against accidentally removing hosted/local warnings or the seven browser-suite boundaries.
5. Require review on a **draft PR** with exact-head CI and Vercel PREVIEW READY. No merge without distinct owner exact-SHA approval. No production environment changes or external test execution.

**Audit limitations:** This inspection is source- and CI/deployment-metadata-based, not a fresh end-to-end audit of an arbitrary user repository, penetration test, accessibility certification, performance benchmark, dependency vulnerability scan, or review of every generated screenshot. The risk register is a living list, not a declaration that every risk is closed.
