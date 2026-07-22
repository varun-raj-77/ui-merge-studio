# Phase 0 evaluation

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

Current evidence meets PASS for the controlled fixture. `AppSidebar` resolves at the selected boundary and includes its changed navigation component, hook, type, stylesheet, and statically related test while excluding the unrelated `TicketPage` heading declaration. `ActivityFilters` expands through the changed `TicketActivityList` integration to the existing `TicketInspector` boundary, includes changed inspector components/hooks/types/utility/style registration/test evidence, and excludes `TicketList` plus `sortTickets`. Repeated normalized artifacts are byte-equivalent by content and analysis ID. A dynamic import produces `partial`; an unchanged selection with no reachable changed graph produces `refused`; stale commit and source-location evidence are refused.

The result does not prove safe integration. Whole-file CSS and test fallback is conservative, the supported module graph is bounded, and no candidate branch is created. The next experiment must treat this slice as evidence to validate—not as an automatically safe patch plan.
