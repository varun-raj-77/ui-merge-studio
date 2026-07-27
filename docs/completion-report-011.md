# Prompt 011 completion report

## Verdict

**MODIFY**

The Showcase is now coherent, selection-driven, source-aware, and honest about evidence replay. It is materially stronger for a skeptical visitor, but it should not be marked LinkedIn-ready until the deployed URLs are checked against the eventual public branch, prompt-history placement is decided, and one independent reviewer validates the five-second comprehension claim.

## Files inspected

- Product: `ShowcaseApp.tsx`, `showcase.css`, `main.tsx`, `App.tsx`, local server/configuration, existing Showcase tests, Studio tests, and Playwright configuration.
- Fixture: base, sidebar, inspector, incompatible, and generated support-dashboard source, styles, hooks, types, tests, package scripts, and fixture README.
- Evidence: schema-v2 feature slices for `30ca640a40db7bbb` and `b5a32b401f4bdad8`; candidate report `045c4d7fbcadd33b`; candidate operations, exclusions, verification output, and prior screenshots.
- Documentation: README, evaluation, limitations, risk register, decision log, demo script, ADRs, completion reports 006–008, product/UX/benchmark documents, and every numbered prompt-history filename.
- Constraints: candidate-generation, source-analysis, instrumentation, preview/runtime, repository-controller, shared bridge, Git/worktree, and verification boundaries were reviewed and left unchanged.

## Files changed

- Product: `apps/studio/src/ShowcaseApp.tsx`, `apps/studio/src/showcase.css`, new `apps/studio/src/showcaseManifest.ts`.
- Tests: `tests/studio/ShowcaseApp.test.tsx`, new `tests/e2e/showcase-evidence.spec.ts`.
- Public documentation: `README.md`, `docs/decision-log.md`, `docs/evaluation.md`, `docs/limitations.md`, `docs/demo-script.md`, `docs/risk-register.md`.
- Process/reporting: new `docs/codex-prompts/011-evidence-driven-showcase-rebuild.md`, this report.
- Evidence: nine PNGs in `docs/evidence/prompt-011/`.

No candidate-generation engine, dependency slicing, source mapping, merge logic, Git/worktree management, verification engine, local server execution behavior, or local-mode product component was changed.

## Showcase data source and schema

`showcaseManifest.ts` is the single typed Showcase source for repository claims. `ShowcaseManifest`, `ShowcaseFeature`, `ShowcaseGate`, and link types cover repository identity, controlled features, selected React boundaries, source/supporting/excluded paths and reasons, verification gates, and focused public links.

`validateShowcaseManifest` fails at module load for unsupported schema, missing repository evidence, incomplete features, invalid source paths, missing dependencies/exclusions, incomplete gates, or repository links outside the configured repository. The UI maps this manifest rather than restating claims in each stage. Visual fixture labels and explanatory product copy remain component presentation.

## Exact real evidence used

- Candidate report: `.ums/generation/045c4d7fbcadd33b/candidate-report.json`.
- Common base: `dc2f93c7e6b9bec4d47e3d71e1ba768c6ac3631b`.
- Source branches: `branch-sidebar` at recorded commit `deeda453…`; `branch-inspector` at recorded commit `6f3a3d59…`.
- Candidate: `combined-result`, commit `f5b0e72834d6ca1e87a62e78abb5d934a618f3ce`, tree `3661c6ea…`, recorded as idempotent.
- Selection artifacts: `b5a32b401f4bdad8` (`AppSidebar`, exact source identity) and `30ca640a40db7bbb` (`ActivityFilters`, exact source identity).
- Included evidence rendered in the plan includes `AppSidebar.tsx`, `SidebarNavItem.tsx`, `useSidebarState.ts`, navigation styles/test/types, `ActivityFilters.tsx`, `TicketActivityList.tsx`, `useActivityFilter.ts`, inspector styles/test/types, and dependency reasons.
- Exclusions rendered: `TicketPage.tsx`, changed `SidebarState`, `TicketList.tsx`, and `sortTickets.ts`, with the report’s graph/reachability reasons.
- Recorded passed gates: install, TypeScript, full tests, focused feature tests, and production build.
- External React/Vite validation is linked through evaluation evidence; it is not presented as this fixture run.

## Hardcoded presentation that remains

- The support-desk visual reconstruction, ticket content, avatar initials, layout, branch colours, explanatory headings, and stage instructions are authored Showcase presentation.
- The preview behavior is a deterministic React reconstruction of the two controlled feature semantics. It does not import or execute the generated fixture/candidate bundles.
- The manifest is manually curated from committed artifacts rather than generated at build time.
- Compatibility is the recorded successful controlled pairing, not a live preflight.

## Workflow state model

- `compare`: baseline/A/B are visible; no selection control is enabled.
- `select`: independent `navigation` and `activity` booleans drive selection cards and the persistent Result Preview; at least one is required for plan review.
- `plan`: selected manifest entries render source/dependency/exclusion details; approval is explicit.
- `verify`: one zero-based gate index reveals recorded gates sequentially; selection does not complete gates.
- `result`: baseline and the selected final preview are shown together. Back to plan/selections preserves choices; Restart clears stage, choices, and gate progress.

## Interaction audit

Removed: duplicate “How it works” actions, automatic verification timer, decorative progress completion, selection hidden inside tiny fixture controls, mutation-confusing result tabs, sample buttons styled as actions, duplicated outcomes, and prompt-first evidence links.

Remaining controls each have one purpose: start, acknowledge comparison, toggle a feature, review plan, approve replay, inspect next gate, open result, revise plan/selections, restart, or follow a specifically labelled repository link.

## Repository-link audit

- Source code → repository root.
- Architecture → `docs/adr/`.
- Evaluation evidence → `docs/evaluation.md`.
- Local setup → README `#run-the-controlled-demo`.
- Limitations → `docs/limitations.md`.
- Candidate evidence → the exact candidate-report path.
- Development history → `docs/codex-prompts/`, explicitly labelled.

No ordinary CTA links to a numbered prompt document. Prompt history is not primary evidence on the landing page, workflow, or completion actions.

## Prompt-history recommendation

Before LinkedIn launch, prefer: **move the detailed prompt history to a separate `development-history` branch** and retain a concise engineering-process note plus a small set of implementation briefs on `main`. This preserves truth and auditability while keeping the primary tree focused on product source and evidence. Do not delete the archive.

## Screenshots created

- `01-landing-1440.png`
- `02-comparison-1440.png`
- `03-one-selection-preview-1440.png`
- `04-integration-plan-1440.png`
- `05-verification-evidence-1440.png`
- `06-final-result-1440.png`
- `07-mobile-landing-390.png`
- `08-mobile-comparison-390.png`
- `09-mobile-result-preview-390.png`

All are under `docs/evidence/prompt-011/`.

## Tests and exact results

- `npm run typecheck`: PASS.
- `npm run build`: PASS, 38 modules transformed.
- Focused `npx vitest run tests/studio/ShowcaseApp.test.tsx --reporter=verbose`: PASS, 8/8.
- `npm run test:studio`: PASS, 6 files and 35/35 tests.
- `npm run fixture:verify`: PASS.
- Focused Playwright Showcase evidence suite: PASS, 4/4 in 15.9s after the final visual fix.
- `git diff --check`: PASS; only line-ending conversion warnings were printed.
- `npm test` inside the managed sandbox: did not start because Node received `EPERM` resolving `C:\Users\rekha`.
- Approved unrestricted `npm test`: TIMEOUT after 304 seconds.
- A second generation-inclusive broad Vitest attempt excluding the environment-gated external Vite candidate test: TIMEOUT after 304 seconds.
- A subsequent bounded multi-directory broad attempt was terminated after it failed to settle; no pass is claimed.

The timeouts are unresolved test-harness/process behavior, not hidden or converted into passes. Focused and required product suites pass, but the full Vitest result is not green for this run.

## Manual browser and visual results

The in-app Browser surface reported no available browser. Repository Playwright was therefore used for real rendered-page automation and screenshots; no in-app-browser pass is claimed.

Playwright completed the entire 1440px journey and the mobile landing/comparison/selection-preview journey. Visual inspection found and fixed one Branch B ref/label overlap, then the full evidence suite was rerun successfully.

## Accessibility and responsive checks

- Semantic `main`, sections, headings, nav, buttons, links, lists, and definition lists are used.
- Feature cards expose `aria-pressed`; progress exposes `aria-current="step"`; Result Preview count uses `aria-live="polite"`.
- Visible `:focus-visible` treatment is global for Showcase buttons and links.
- Comparison-stage feature controls are disabled and cannot select accidentally.
- Reduced motion disables animation, transition, and smooth scrolling.
- Playwright asserted no horizontal overflow at 1440, 1024, 768, and 390px.
- Responsive CSS removes sticky preview behavior when stacked and avoids fixed content-obscuring panels.
- Keyboard semantics are native. A full screen-reader audit and exhaustive tab-order recording were not performed.

## Remaining limitations and unresolved risks

- The hosted page still reconstructs fixture visuals; it does not run the generated candidate.
- The manifest can drift because it is curated, though schema and UI integrity tests reduce the risk.
- The evidence link targets assume artifacts are present on the public `main` branch.
- Full Vitest did not complete in this environment.
- Five-second recruiter comprehension has been designed for but not independently user-tested.
- Only one controlled fixture is presented; external proof remains documentation rather than an alternate Showcase scenario.
- Prompt-history placement is unresolved.

## Required adversarial review

- **What has actually been proven?** The UI causally reflects selections; the repository contains exact source mappings, dependency/exclusion plans, a deterministic candidate identity, and five passing recorded gates for this controlled pair.
- **What remains replayed rather than executed?** All Git, worktree, analysis, candidate generation, verification, and candidate runtime behavior in hosted mode.
- **What still looks fixture-specific?** The support-desk reconstruction, feature labels, two known branches, and visual feature toggles.
- **Could a skeptical engineer still call it hardcoded?** Yes, if judging only the pixels. The visual layer is fixture-authored.
- **What evidence disproves that criticism?** Typed source-backed manifest, exact schema-v2 identities, candidate operations, dependency reasons, explicit exclusions, deterministic commit/tree, five real gate records, engine tests, and external Vite evaluation.
- **What parts are still hardcoded presentation?** Layout, sample ticket copy, colours, feature visual reconstruction, stage copy, and manifest curation.
- **Is the Result Preview causally connected to selections?** Yes. Both preview features render directly from the same selection state used for plan/result filtering; tests prove add/remove behavior.
- **Can a recruiter understand the product in five seconds?** Likely, from the headline, single CTA, live combined preview, and boundary note; not yet independently validated.
- **Does the Showcase reveal source and dependency integration?** Yes, explicitly in Plan and Result.
- **Do links establish credibility or expose process too early?** Primary links now establish product evidence. Process appears only under clearly labelled Development history.
- **Should prompt history remain on `main`?** Not in its current detailed form for launch; move the full archive to a development-history branch and retain concise briefs.
- **Is it genuinely ready for LinkedIn launch?** Not yet. The unresolved full-suite timeout, link/deployment check, history placement, and independent comprehension review justify MODIFY.

## Recommended next action

Resolve the full Vitest hang in a clean process environment, deploy the exact branch to a review URL, validate every public link there, run one skeptical-engineer and one recruiter five-second test, then decide prompt-history placement. Reassess the verdict only after those checks.

No commit was created.
