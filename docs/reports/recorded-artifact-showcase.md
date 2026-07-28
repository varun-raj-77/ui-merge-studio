# Prompt 012 completion report

## Verdict

**MODIFY**

The architectural credibility defects are removed locally: real compiled artifacts, a genuine engine run, generated evidence, strict two-selection semantics, immutable recorded verification, and build-time freshness validation are implemented. Final public readiness still requires deployment URL/link validation and independent review.

## Preparation architecture and engine reuse

`scripts/prepare-showcase.ts` verifies the fixture, resolves exact refs, runs `FeatureSliceAnalyzer` for `AppSidebar` and `ActivityFilters`, and passes those returned artifacts to the existing `CandidateGenerator`. It does not implement merging. Detached worktrees build the four exact commits with `--base=./`; temporary resources are removed in `finally`.

`scripts/validate-showcase.ts` validates the typed report, normalized manifest hash, generated manifest byte equality, artifact existence, and directory SHA-256 hashes. `npm run build` invokes it first. Vercel only serves the resulting static files.

## Exact recorded identities and artifacts

- Run: `352e72c5bd76b7ef`
- Common base: `65450c9291d5058983f07991d48e326898e22a02`
- Branch A: `branch-sidebar` at `42ed6234adc6f6deaa1c0a7744d91b532baf8b7d`
- Branch B: `branch-inspector` at `e566884d3ba2a3ae2b17f1d1a2e645a2c53ff5d9`
- Candidate: `combined-result` at `55cba9c628423492f9579212c86813a09e22811c`
- Artifacts: `apps/studio/public/showcase-runs/352e72c5bd76b7ef/{baseline,branch-a,branch-b,combined-result}/`
- Report: `docs/evidence/showcase/latest/run-report.json`
- Generated manifest: `apps/studio/src/generated/showcaseRun.json`

The exact artifact and normalized manifest hashes are in the report. Schema version 1 is `PublicShowcaseReport` in `packages/showcase-evidence/src/schema.ts`.

## Sanitization, selection, and verification

The schema rejects local absolute paths, `.ums`, prompt-history paths, malformed commits/hashes, non-passing verification, incomplete selections, and off-repository links. Commands are portable npm commands; output tails and temporary paths are not published. No timing is claimed because the engine report has no structured durations.

Zero or one selection shows actual baseline plus an explicit lock. Only navigation plus activity reveals the recorded candidate and unlocks Plan/Result. Removing either relocks downstream stages. Verification details are immutable recorded results.

## Files inspected and changed

Inspected: fixture templates/generated Git repository; analyzer, Git model, candidate generator/types/reports; ignored source-slice/candidate evidence; fixture scripts; Showcase, styles, manifest, server/Vite/Vercel; unit/Playwright suites; product and evidence documentation.

Changed: preparation/validation/schema scripts; package scripts; generated report/manifest; four public artifact trees; Showcase app/styles; unit and Playwright tests; Vitest configuration; README, product brief, decision log, evaluation, limitations, risks, demo script, ADR 0010, and this report.

## Public-link and presentation audit

Primary links target the committed report, completion report, evaluation, ADR 0010, limitations, source, and README setup. None target `.ums`, local paths, or prompt history. Remaining authored presentation is Studio layout, annotations, labels, explanatory copy, and source cards around real iframes. No candidate application UI is reconstructed.

## Full-suite diagnosis

The unrestricted `npm test` exceeded 360 seconds with no default-reporter progress. A verbose run excluding `externalViteCandidate.test.ts` also exceeded 300 seconds. The suspected candidate integration test was then isolated and passed in 138.36 seconds (its test body took 133.30 seconds). This supports cumulative sequential real-install/generation cost—not a proven open-handle hang—as the practical cause; `fileParallelism: false` makes the broad suite accumulate several integration workflows. No test was skipped or weakened. The root Vitest environment/setup is now explicit for consistent Studio execution.

## Prompt-history recommendation

Move `docs/codex-prompts/` to a separate `development-history` branch, retaining concise decisions and completion reports on `main`. Do not rewrite history or delete the archive without explicit approval.

## Adversarial review

- Actual compiled applications and generated candidate: yes.
- Candidate UI reconstructed or verification manually declared: no.
- One selection unlocks the candidate: no.
- Tampering detected and run reproducible: yes.
- Source/dependency/exclusion claims traceable: yes.
- Hosted live-execution implication or local path leakage: no.
- Fixture-specific: repository, two boundaries, exact combination.
- Presentation-only: Studio framing, annotations, copy, navigation.
- LinkedIn-ready: not yet; deployment/link and independent comprehension checks remain.

## Test record

Preparation passed fixture validation, generation, five candidate gates, and four production builds. The first publication attempt correctly failed on an over-broad absolute-path detector; it was corrected and the complete idempotent run passed. A browser run then found nested artifact routing and sandbox capability defects; preparation now injects a deterministic `/tickets` history bootstrap with a relative base, and the iframe permits trusted same-origin module loading.

Focused package/Showcase tests passed 9/9; Studio passed 36/36; fixture verification and production build passed. Production Playwright passed 4/4 at 1440, 1024, 768, and 390 pixels and captured ten PNGs under `docs/evidence/recorded-artifact-showcase/`. The in-app browser backend was unavailable, so no in-app-browser manual pass is claimed; rendered screenshots were visually inspected instead.

No commit was created.
