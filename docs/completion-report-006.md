# Prompt 006 completion report

## 1. Starting branch and commit

Work began from `codex/phase0-candidate-generation` at `576b68c` (`docs: record deterministic candidate-generation pass`). The implementation branch is `codex/phase0-guided-product-experience`.

## 2. Baseline UX defects observed directly

The baseline opened as a vertically stacked research console. Product purpose, fixture context, current step, intended selections, and output were not clear in the first viewport. Raw branch names and implementation evidence dominated, selection required ancestor reasoning, candidate planning was opaque, and the happy path required repeated document scrolling.

## 3. Baseline API defects observed directly

`POST /api/previews/left` and `/right` remained pending until ref validation, worktree creation, dependency installation, Vite startup, and readiness completed. The UI had no operation identifier or independently observable lifecycle.

## 4. Baseline cold launch timing

24.037 seconds from the launch action to two validated ready previews on the controlled machine.

## 5. Baseline warm launch timing

21.813 seconds. The baseline rebuilt preview preparation instead of retaining safe same-slot, exact-commit preparation.

## 6. Baseline restart timing

16.615 seconds for a single right-slot restart.

## 7. Baseline launch API acknowledgment time

There was no separate acknowledgment. The left and right POST requests completed in 22.329 and 22.331 seconds.

## 8. Baseline preview API call count

Two preview launch POSTs and zero preview-operation status GETs.

## 9. Baseline duplicate/overlapping request count

Zero duplicate or overlapping preview launches in the measured baseline. A duplicated repository GET was traced to React Strict Mode, not preview orchestration.

## 10. Root cause of multi-minute pending API calls

The synchronous route handler awaited every expensive step: Git ref resolution, detached-worktree creation, `npm ci`, port allocation, Vite spawn, and HTTP readiness.

## 11. Root cause of repeated polling

The reported repeated preview polling could not be reproduced on `576b68c`; that version had no preview-status polling implementation. Prompt 006 introduces polling deliberately and bounds it with one awaited request at a time, backoff, abort, stale-operation checks, and terminal stop.

## 12. UX information-architecture decisions

The default surface now prioritizes product promise, a four-step workflow, compact demo context, two peer preview cards, compact selection confirmations, synchronization status, and one persistent combine tray. Diagnostics moved behind progressive disclosure.

## 13. New Guided Mode workflow

`Compare → Select → Combine → Verify`: load both named versions, choose one visible feature in each preview, let real analysis and preflight run automatically, then use one `Create combined branch` action.

## 14. New Technical Details workflow

The `Technical details` drawer exposes operation phases/timings, raw branches, source identities, locations, ancestors, supporting changes, tests, exclusions, unresolved dependencies, candidate operations, verification evidence, and report downloads. Focus enters the close button and Escape closes the drawer.

## 15. Fixture-context changes

The outer product identifies the controlled fixture as `Sample Support Dashboard`, explains that sample support tickets demonstrate synchronized navigation and verified branch generation, and states the exact comparison task.

## 16. Beacon Ops rename/context decision

The fixture source was not mutated merely to rebrand it. Its internal `Beacon Ops` text is contextualized by the surrounding `Sample Support Dashboard` demo framing, satisfying the prompt without changing source-branch evidence.

## 17. Selection-promotion strategy

The clicked source identity is analyzed through the existing deterministic branch-change and dependency graph. Reverse integration and changed-boundary evidence expand repeated implementation leaves to the supported changed feature boundary; the resolved analysis label, rather than the raw leaf, becomes the Guided selection.

## 18. Ambiguous-selection behavior

The analyzer never guesses through unresolved evidence. Partial/refused outcomes block combination and explain the next step. `Choose a different feature` restarts visual selection; deterministic ancestor alternatives and identities remain available in Technical Details.

## 19. Human-readable feature-label strategy

`demoScenario.ts` maps source presentation identities to `Collapsible Sidebar` and `Activity Filters`. Unknown identities use deterministic camel-case formatting. Labels affect presentation only and never enter analysis, planning, or generation inputs.

## 20. Layout and scrolling changes

The two versions are peer columns, each preview scrolls within a bounded frame, and supporting cards remain compact. Tests and screenshots at 1280×720, 1440×900, and 1920×1080 show no outer horizontal overflow. The 1440×900 happy path needs no document scroll.

## 21. Persistent action-area behavior

The sticky tray always shows both selected-feature states, compatibility, a concise explanation, the primary combine action, and a Technical Details action.

## 22. Readable candidate-plan experience

Automatic preflight produces a visible before-mutation summary grouped by Version A, Version B, exclusions, changed files, and verification gates. Exact operations remain expandable; DevTools is unnecessary.

## 23. Preview loading experience

Each card shows real operation phases such as checking the version, stopping the old runtime, preparing isolated files/packages, allocating a port, starting the app, waiting, ready, failed, cancelled, or superseded. Progress is indeterminate and phase-based, never a fake percentage.

## 24. Asynchronous preview operation architecture

`PreviewOperationManager` immediately returns a 202 acknowledgment and records pending/running/ready/failed/cancelled/superseded state, phase timings, result/error, and supersession identity. Slots execute concurrently; work within one slot is serialized.

## 25. Cancellation and supersession behavior

Identical in-flight launches coalesce. A different same-slot launch aborts and supersedes the prior operation. Explicit cancellation prevents stale completion from restoring readiness. Per-slot and bulk stop now cancel and await operation chains before removing prepared resources.

## 26. Polling lifecycle changes

The client runs one awaited poll loop per operation with bounded backoff and `AbortSignal`. Requests cannot overlap, stop on every terminal state, ignore stale operation IDs, and abort on replacement or unmount.

## 27. Candidate-generation progress experience

The generator emits real validate/plan/worktree/apply/audit/verification/commit/cleanup events. Guided text maps them to preparing a clean workspace, applying each named feature, reconciling supporting code, checking files and gates, creating the branch, and cleanup.

## 28. Success experience

The focused result states `Combined branch ready`, names `combined-result`, lists both included features and passed verification gates, and presents `Open verified result` immediately with report/details actions.

## 29. Failure and refusal experience

Blocked states explain what happened, why automatic integration is unsafe, that no new candidate was created, that source branches were not changed, what to try next, and where technical evidence lives. Verification failure reports rollback and cleanup rather than implying success.

## 30. Accessibility changes

Native buttons/selects, visible focus, logical labels, live status regions, keyboard preview selection, non-color status text, one H1, titled iframes, dialog semantics, focus entry, Escape close, and reduced-motion CSS were added or verified.

## 31. Files changed

Production: `apps/studio/server.ts`, `apps/studio/src/App.tsx`, `demoScenario.ts`, `operationPolling.ts`, `studio.css`, `packages/preview-runtime/src/previewController.ts`, `previewOperations.ts`, and `packages/candidate-generation/src/candidateGenerator.ts`.

Tests/config: five E2E specs, `previewOperations.test.ts`, three Studio tests, and `vitest.config.ts`.

Documentation/evidence: README, seven requested existing docs, ADR 0007, UX/performance evaluations, this report, exact prompt archive, and baseline/final screenshots.

## 32. Components added

The rebuilt surface adds/testably separates `WorkflowStepper`, Guided version cards, `SlicePanel`, `CandidatePanel`, `TechnicalDrawer`, identity/test evidence panels, demo-scenario configuration, and operation polling/orchestration.

## 33. Components removed or replaced

The long default research-console flow, external hover/selection blocks, manual analyze/preflight/generate sequence, and bottom-only candidate controls were replaced. Technical evidence was moved, not deleted.

## 34. Server/API changes

Preview POST now returns 202 with an operation ID. GET/DELETE operation routes expose status/cancellation. Bulk and per-slot DELETE routes cancel and await active chains. Candidate progress exposes actual generator stages.

## 35. Generic logic versus fixture metadata

Generic packages consume Git refs, source identities, AST/dependency evidence, and operation state only. Fixture names, descriptions, readable labels, route copy, candidate display name, verification descriptions, and optional demo expectations live in `demoScenario.ts`.

## 36. Existing engine behavior preserved

Real worktree isolation, instrumentation, source mapping, synchronization, feature/test slicing, plan-before-mutation, AST reconstruction, import/export reconciliation, verification, deterministic repeat, rollback, refusal, candidate launch, and machine-readable reports remain active.

## 37. New tests added

Tests cover operation acknowledgment/phases, coalescing, concurrent slots, supersession, cancellation, stop-chain cleanup, polling terminal/abort/backoff behavior, Guided rendering, automatic analysis/preflight, no jargon, exact responsive targets, keyboard/drawer behavior, structural accessibility, real candidate success/conflict, source mapping, and cleanup.

## 38. Exact commands run

- `npm run typecheck`
- `npm test`
- `npm run test:preview-runtime`
- `npm run test:studio`
- `npm run test:e2e`
- `npx playwright test -c apps/studio/playwright.config.ts tests/e2e/candidate-generation.spec.ts tests/e2e/source-mapping.spec.ts`
- `npx playwright test -c apps/studio/playwright.config.ts tests/e2e/guided-experience.spec.ts`
- `npx playwright test -c apps/studio/playwright.config.ts tests/e2e/feature-slice.spec.ts tests/e2e/multi-preview.spec.ts`
- `npx playwright test -c apps/studio/playwright.config.ts tests/e2e/guided-experience.spec.ts -g "acknowledges launches"`
- `npm run build`
- `npm run fixture:verify`

Read-only Git, process, worktree, anti-hard-coding, screenshot, and timing audits were also run. Baseline and improved product runs used the real `npm run dev` server and Playwright Chromium.

## 39. Complete Vitest results

Final `npm test`: 18 files passed, 80 tests passed, 0 failed, 440.64 seconds.

## 40. Focused preview/orchestration test results

Final `npm run test:preview-runtime`: 3 files and 12 tests passed. `npm run test:studio`: 5 files and 23 tests passed. The post-race browser cleanup regression passed 1/1 in 10.1 seconds.

## 41. Candidate-generation test results

The complete matrix passed candidate integration 1/1, failure/refusal/rollback 8/8, and planner/transformation 3/3. The real browser candidate success/idempotence and conflict-refusal cases passed 2/2.

## 42. Playwright results

All 15 unique final-code scenarios passed in bounded groups: candidate/source mapping 6/6 in 6.6 minutes; Guided/accessibility/orchestration 3/3 in 1.2 minutes; feature-slice/multi-preview 6/6 in 3.9 minutes. A monolithic `npm run test:e2e` first exposed three test-harness assumptions (12/15 passed); after correction, a later monolithic wrapper exceeded its outer timeout without emitting a test failure. No scenario was omitted: every spec passed in the bounded final runs.

## 43. Accessibility results

Keyboard selection and drawer focus/Escape passed in Chromium. Automated structural audits passed in initial and ready states: one H1, zero visible unnamed buttons, zero unnamed iframes, zero duplicate IDs, and no outer horizontal overflow. This is not a formal WCAG or assistive-technology conformance audit.

## 44. Build results

`npm run typecheck` passed. `npm run build` passed: 35 modules, 224.10 kB JS (69.02 kB gzip), 10.87 kB CSS (3.19 kB gzip).

## 45. Fixture verification result

`npm run fixture:verify` passed against `fixtures/generated/support-dashboard`.

## 46. Improved cold launch timing

18.123 seconds, down from 24.037 seconds in the controlled comparison and below the prompt's 20-second local target.

## 47. Improved warm launch timing

3.807 seconds, down from 21.813 seconds.

## 48. Improved restart timing

4.027 seconds for a warm right-slot restart, down from 16.615 seconds.

## 49. Improved API acknowledgment time

99 ms click-to-first acknowledgment; measured left/right POST durations were 2 ms and 19 ms. A later single restart acknowledged in 85 ms.

## 50. Improved preview API call count

Two launch POSTs plus 50 total status GETs for the measured cold dual run; warm dual used 16 GETs and warm single restart used 25. Polling now exists because the operation is asynchronous.

## 51. Improved duplicate/overlapping request count

Zero overlapping status requests and zero duplicate worktrees/runtimes. Duplicate identical launches return the same operation ID with `coalesced: true`.

## 52. Time to first truthful progress

The operation acknowledgment and first phase state are available within the measured 99 ms acknowledgment interval, rather than after preparation completes.

## 53. Longest request duration before and after

Baseline preview launch: 22.331 seconds. Improved initiating launch: 19 ms maximum of the measured pair. The longest directly measured operation-status GET was 37 ms.

## 54. Manual first-time-user walkthrough

In a fresh 1440×900 Chromium session with no prior app state or DevTools: the first viewport explained UI Merge Studio, Sample Support Dashboard, both named versions, Compare/Select/Combine/Verify, and `Load both versions`; both previews launched; nested visible controls resolved to the two named features; automatic real analysis/preflight enabled the persistent action; generation verified the real branch; the result opened successfully; Technical Details remained optional.

## 55. Final number of primary clicks

Six activations create the verified branch: load; enter and complete Version A selection; enter and complete Version B selection; create. Opening the verified result is a seventh.

## 56. Final number of document scrolls

Zero on the 1440×900 Guided happy path. Embedded applications retain bounded internal scrolling.

## 57. Whether DevTools was required

No.

## 58. Whether verbal coaching was required

No. The visible copy supplied the task, fixture meaning, next action, compatibility, plan, progress, and result.

## 59. Before-and-after screenshots

Baseline: `docs/evidence/prompt-006/baseline-1440x900.png` and `baseline-ready-1440x900.png`.

Final: `guided-initial-1440x900.png`, `guided-selected-1440x900.png`, `guided-1280x720.png`, `guided-1440x900.png`, and `guided-1920x1080.png`.

## 60. Remaining UX limitations

The embedded fixture still shows its internal Beacon Ops name; arbitrary advanced branch choices retain scenario narrative; iframe navigation is an assistive-technology boundary; ambiguity alternatives are evidence-driven rather than semantic AI; the concise success view keeps exhaustive evidence secondary.

## 61. Remaining performance limitations

Cold launch still performs a real dependency install and varies with disk, cache, antivirus, and CPU. Warm reuse is restricted to the same slot and exact commit. Timings are controlled-machine evidence, not service-level guarantees.

## 62. Risks introduced

Retained prepared worktrees increase temporary disk use until explicit stop/shutdown. The asynchronous API adds operation-state retention and polling complexity. A manual interruption exposed a cleanup routing race; it was fixed by routing stop through `PreviewOperationManager`, then covered by unit and browser regressions.

## 63. Anti-hard-coding audit

Search found no fixture branch names, `AppSidebar`, `ActivityFilters`, or presentation labels in generic engine packages or server orchestration. Scenario labels exist only in the presentation configuration/UI tests. Candidate success still derives from source evidence and verification, never expected file lists.

## 64. Source-branch immutability audit

Fixture refs after all runs: `main` `2337f31b11a1cd2ea6ea071ab5ae862e15890e1a`; `branch-sidebar` `b7a636313e602710fabd1ae160711a6e343255c2`; `branch-inspector` `324acbfcd59a12bf87c06f3441dfa36a6d9bd23c`; `branch-incompatible-route` `d534ac7b9711f044cf5587eb06cd5ca779d4dace`. The fixture worktree was clean. Tests also assert refs remain unchanged around success and refusal.

## 65. Worktree cleanup audit

After the final runs, `git worktree list --porcelain` contained only the fixture main worktree. Exact orphan temp directories from timed/interrupted harness runs were audited and removed; no `ui-merge-studio-*` temp directory remained.

## 66. Process cleanup audit

No Studio server, preview Vite, or candidate process remained. Process trees started for manual measurements were resolved by exact PID/command line and stopped; the final query found no matching process.

## 67. Polling cleanup audit

Unit tests prove terminal, failure, cancellation, supersession, stale-response, and unmount stop behavior. Browser cancellation/bulk cleanup passed. Final teardown left no server operation or client polling process alive.

## 68. Commits created

Implementation commit: `34d28dc feat: rebuild studio around guided async previews`. Cleanup/test-hardening commit: `d741414 test: harden guided workflow cleanup evidence`. A final `docs: record prompt 006 product-experience pass` commit contains the documentation and evidence set. The prompt archive SHA-256 matches the attachment: `FF65CBF7E6B391C068BE3F02C53A50E4636EC6B43756670927B86B81A414AA38`.

## 69. What has actually been proven

On the controlled local React/Vite fixture, a first-time Guided workflow can launch two isolated branch previews through responsive asynchronous operations, synchronize them, map rendered elements to source, deterministically select/analyze two meaningful features, explain a real preflight, create and verify a deterministic combined branch, open it, refuse unsafe work, and clean up. The API, UI, Git, AST, test, build, rollback, and evidence paths are real.

## 70. What remains unproven

Arbitrary repositories/frameworks, semantic merging outside the supported grammar, formal WCAG conformance, assistive-technology user testing, production security/multi-user operation, cloud execution, authentication, collaboration, deployment, and universal performance are not proven.

## 71. Final recommendation

**PASS** for Prompt 006's controlled Phase 0 scope. The result is immediately understandable, materially easier to operate, promptly acknowledged, truthful during long work, deterministic, conservative on unsupported inputs, evidence-backed, keyboard operable, clean after execution, and demo-ready. This is not a claim of general repository or production readiness.
