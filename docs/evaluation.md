# Phase 0 evaluation

## Prompt 006 product-experience result

Prompt 006 is evaluated separately from the engine proof. PASS requires immediate task clarity, fixture context, one guided happy path, API acknowledgement below one second, truthful operation progress, bounded non-overlapping polling, cold dual readiness below 20 seconds on the controlled measured setup, warm dual and restart readiness below 10 seconds, technical evidence preservation, keyboard operation, responsive layouts, and no regression in Prompt 001–005 behavior.

The measured implementation meets those controlled targets: the two launch POST requests completed in 2 ms and 19 ms (99 ms click-to-first-response), cold dual readiness completed in 18.123 seconds, warm dual readiness completed in 3.807 seconds, and a warm single-slot restart completed in 4.027 seconds with an 85 ms acknowledgement. Polling used 50 cold, 16 warm-dual, and 25 warm-restart GETs with zero overlap. These are one-machine measurements, not service-level guarantees.

The controlled Prompt 006 result is **PASS**. The complete final-code browser matrix passed as three bounded Playwright groups (15/15 scenarios), the complete Vitest matrix passed (79/79), the production build and fixture contract passed, the browser walkthrough completed without DevTools or verbal coaching, source refs remained fixed, and final worktree/process/polling cleanup audits were clean. A monolithic Playwright invocation later exceeded its outer wrapper timeout without a test failure; bounded groups were used to obtain deterministic final evidence for every scenario.

## Prompt 005 candidate-generation result

Current evidence meets **PASS** for the controlled fixture. The real `AppSidebar` and expanded `ActivityFilters` slices produce a plan-before-mutation candidate exactly one commit above `main`. `combined-result` contains both behaviors, retains `Support Tickets`, and contains neither `sortTickets` nor the sorting test. Install, TypeScript, full tests, focused feature tests, build, browser behavior, repeated tree equality, changed-file equality, source-ref immutability, failure cleanup, and a source-level conflict refusal are covered.

This proves one bounded React/TypeScript composition—not arbitrary semantic merge. The operation grammar remains conservative and unsupported ownership refuses.

PASS requires visual component selection to lead through source identity, common-ancestor delta, symbol/hunk dependencies, bounded reconciliation, and verification to a functioning candidate that excludes unrelated edits. MODIFY applies when the claim remains plausible but a bounded contract or implementation must change. ABANDON applies when reliable separation cannot be achieved without manual file ownership, prepared patches, or metadata cheating.

Commit boundaries are not a valid feature-isolation signal. Both positive branches intentionally contain useful and unrelated behavior in one commit. Branch names, messages, documentation, generator details, verification expectations, and test metadata are forbidden production inputs. A result that can pass by cherry-picking or commit filtering fails.

This repository evaluates only fixture reproducibility, topology, behavior, and anti-cheating preconditions. It does not evaluate the future engine.

## Rendered element-to-source experiment

PASS requires generic AST instrumentation to report accurate repository-relative component definitions for baseline, sidebar, and inspector branches; nested ancestor navigation; distinct repeated runtime instances; valid line and column; preserved normal behavior; and explicit refusal when evidence is insufficient. No fixture lookup data may participate.

MODIFY applies if the mechanism remains viable but only single-root components are exact, fragment boundaries need a narrower contract, columns prove unreliable, or wrapper/ancestor behavior needs a bounded convention.

ABANDON applies if correct mapping requires fixture maps, branch semantics, React private internals, frequent guessing, behavior-changing wrappers, or identities that do not survive ordinary Vite development transforms.

Current automated evidence meets PASS for the controlled fixture. This is a prerequisite result, not proof of dependency slicing or the product claim.

## Multi-preview synchronization experiment

PASS requires two simultaneous detached-worktree previews, isolated session/window/origin identity, bidirectional compatible ticket synchronization, deterministic loop prevention, equivalent viewport presets, two coexisting source selections, restart invalidation, stale-envelope rejection, independent failure state, and explicit refusal for the incompatible path contract. Capability decisions must come from runtime contract evidence rather than branch semantics.

Current evidence meets PASS for the controlled React/Vite fixture. Unit and component tests cover protocol schemas, capability compatibility, central state, selection isolation, restart invalidation, failure isolation, and viewport UI. Playwright covers compatible synchronization in both directions, all three viewport presets, `AppSidebar` plus `ActivityFilters` selection, restart/stale-session handling, invalid message rejection, and independently interactive incompatible previews. The prior source-mapping Playwright scenarios remain green.

This result proves a comparison-workspace prerequisite only. It does not prove arbitrary application-state equivalence, router generality, source dependency ownership, candidate generation, source integration, or a functioning combined branch.

## Dependency-aware feature-slice experiment

PASS requires a real source-mapped selection; merge-base and branch-commit validation; a deterministic AST source index; typed forward and reverse evidence; explicit boundary escalation; changed symbol, style, type, asset, and test handling; affirmative exclusion of each fixture's intentional unrelated production delta; honest partial/refusal behavior; per-preview isolation; restart invalidation; and no production fixture semantics.

Current evidence meets PASS for the supported controlled-fixture syntax. `AppSidebar` resolves at the selected boundary and includes its changed navigation component, hook, type, stylesheet, and relevant test unit while excluding the unrelated `TicketPage` heading declaration. `ActivityFilters` expands through the changed `TicketActivityList` integration to the existing `TicketInspector` boundary, includes changed inspector components/hooks/types/utility/style registration and the activity/clipboard test, and excludes `TicketList`, `sortTickets`, and the sibling sorting test. The inspector test file is emitted in `test-units` mode with its required import specifiers and no whole-file test fallback. Repeated normalized artifacts are byte-equivalent by content and analysis ID. Ambiguous shared setup and unresolved helpers produce `partial`; a dynamic test factory is refused at test-file level; stale commit and source-location evidence are refused.

The prior Prompt 004 blocker is eliminated for the conventional test syntax exercised here, so Prompt 004's final status is upgraded from MODIFY to PASS within that bounded contract. This does not prove arbitrary test-file slicing or safe integration. Whole-file CSS remains conservative, the supported module/test graph is bounded, and no candidate branch is created. A later integration experiment must treat this slice as evidence to validate—not as an automatically safe patch plan.
# Prompt 006C acceptance

The controlled Phase 0 shell is recommended **PASS** when the final command matrix remains green. The implementation preserves deterministic runtime mapping, Git/static analysis, generation, verification, refusal, rollback, and cleanup while making the visual decision-to-source relationship explicit.

## Prompt 006D visual-system acceptance

Prompt 006D meets the product-facing acceptance criteria in the controlled demo: Guided Mode is no longer a dark dashboard; the shared token system is explicit; previews dominate the workspace; branch selectors are removed; meaningful experiment labels and raw refs are both present; the compact warm tray expresses selection and safety state; the evidence drawer remains deliberately dark; the homepage relationship diagram has aligned split/join connectors; and source/result tabs clearly distinguish Navigation source, Activity-filter source, and Combined result.

Focused Studio tests passed 27/27. The initial focused browser group passed five of six scenarios; its only failure was a stale exact-copy assertion expecting “Live” after the UI intentionally changed to “Live and synchronized.” The corrected single-scenario rerun exceeded the ten-minute outer command timeout, although the verified combined-result view and screenshot had already been reached. Final regression results and fixture verification are recorded in the 006D completion report.
