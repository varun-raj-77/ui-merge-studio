# Codex Prompt 003 — Prove Multi-Preview Synchronization and Cross-Branch Selection

## Objective

Extend UI Merge Studio so a developer can run at least two React branch previews side by side, keep their route, viewport, and controlled fixture context synchronized, and select one source-mapped React boundary from each branch without stale state, identity leakage, or cross-preview confusion.

This task must prove the comparison workspace required before dependency extraction begins.

The milestone succeeds only when:

1. Multiple isolated branch previews run simultaneously.
2. The user can interact with them side by side.
3. Supported navigation and fixture context remain aligned.
4. Each preview preserves its own branch and runtime identity.
5. A source-mapped component can be selected independently from each branch.
6. Unsupported or incompatible synchronization is explicitly reported rather than silently forced.

Do not implement dependency slicing, candidate branch generation, source integration, or `combined-result`.

---

## Repository Context

Repository: UI Merge Studio

Current proven state:

* A deterministic React + TypeScript + Vite fixture exists.
* Fixture branches include:

  * `main`
  * `branch-sidebar`
  * `branch-inspector`
  * `branch-incompatible-route`
* Prompt 002 implemented:

  * build-time React source instrumentation;
  * isolated temporary Git worktrees;
  * preview process and port management;
  * a Studio shell;
  * source-mapped selection mode;
  * nested boundary navigation;
  * repeated-instance identity;
  * refusal behavior;
  * development-only instrumentation.

Current working architecture includes:

* `apps/studio`
* `packages/repository-controller`
* `packages/preview-runtime`
* `packages/source-instrumentation`
* `packages/shared`

Inspect the repository before changing anything.

Do not modify the generated fixture history.

Work on a new isolated branch.

Suggested branch:

```text
codex/phase0-multi-preview-sync
```

---

## Core User Story

A developer opens UI Merge Studio and selects:

```text
branch-sidebar
branch-inspector
```

The Studio launches both branches in separate isolated worktrees and displays them side by side.

The developer navigates to the same ticket in either preview.

Both previews align to the equivalent route and fixture entity when their contracts are compatible.

The developer then:

1. Selects `AppSidebar` from `branch-sidebar`.
2. Selects `ActivityFilters` or `TicketInspector` from `branch-inspector`.
3. Reviews both selections in the Studio.

Each selection must retain:

* branch/ref identity;
* preview session identity;
* runtime instance identity;
* source definition identity;
* source file;
* line and column;
* component name;
* mapping confidence.

A message from one preview must never be accepted as belonging to another preview.

---

# Scope

## Required

Implement:

* simultaneous launch of at least two branch previews;
* a responsive side-by-side comparison workspace;
* independent preview lifecycle and status;
* preview-session identity;
* versioned parent/preview bridge messages;
* origin and session validation;
* route synchronization for supported same-contract routes;
* selected fixture/entity synchronization;
* viewport preset synchronization;
* independent source-mapped selection per preview;
* a combined selection summary;
* stale-message rejection;
* preview restart handling;
* explicit synchronization status and refusal reasons;
* automated happy-path and failure-path coverage;
* documentation of proven and unproven behavior.

## Excluded

Do not implement:

* dependency graph extraction;
* source ownership inference;
* feature-slice analysis;
* copying files or hunks;
* AST merge transforms;
* candidate branch creation;
* `combined-result`;
* compilation of a merged candidate;
* visual regression baselines;
* accessibility audit orchestration;
* cloud execution;
* authentication;
* team collaboration;
* arbitrary application-state synchronization;
* framework support beyond the current React/Vite fixture.

---

# Product Behavior

## 1. Branch selection and launch

Allow the Studio to launch at least two selected refs simultaneously.

The controller must:

* validate each Git ref;
* create a distinct temporary detached worktree;
* allocate a unique port;
* install or prepare dependencies safely;
* start each Vite preview independently;
* expose readiness and failure states;
* stop and clean each preview independently;
* avoid modifying source branches;
* never delete a worktree it did not positively create and identify.

The user must be able to see, for each preview:

* branch/ref;
* startup state;
* port or internal preview identity;
* running, failed, restarting, or stopped state.

Do not use branch names as semantic feature hints.

---

## 2. Comparison workspace

Display two previews side by side on normal desktop widths.

The interface should prioritize the running applications rather than Git details.

Required visible controls:

* selected branches;
* preview status;
* synchronization status;
* selection-mode control per preview or a clearly scoped global control;
* viewport preset;
* restart preview;
* current selected boundary for each branch.

The layout must remain usable on narrower screens by stacking previews vertically.

Do not build a large dashboard.

---

## 3. Preview session identity

Introduce a unique session ID for every running preview instance.

A preview identity must include enough information to distinguish:

* branch/ref;
* worktree or controller preview ID;
* session generation;
* bridge protocol version.

When a preview restarts, it must receive a new session identity.

Messages from an old session must be rejected.

Do not trust a branch name alone.

---

## 4. Versioned bridge protocol

Extend the current bridge contracts rather than adding unvalidated ad hoc messages.

Every parent-to-preview and preview-to-parent message must be schema validated.

Define explicit message categories such as:

```text
PREVIEW_READY
PREVIEW_STATE
NAVIGATION_CHANGED
SYNC_NAVIGATION
FIXTURE_CONTEXT_CHANGED
SYNC_FIXTURE_CONTEXT
VIEWPORT_CHANGED
SELECTION_CHANGED
SELECTION_CLEARED
SYNC_REFUSED
RUNTIME_ERROR
```

Exact naming may differ if the existing conventions suggest better names.

Every message must contain:

* protocol version;
* preview/session identity;
* message type;
* validated payload.

Reject:

* malformed messages;
* unknown protocol versions;
* mismatched preview IDs;
* mismatched session IDs;
* stale generations;
* unexpected source windows;
* messages from previews not registered by the Studio.

Avoid broad `postMessage("*")` trust.

Use the strongest origin validation possible for local dynamically allocated preview origins and document any remaining limitation.

---

## 5. Route synchronization

Synchronize supported navigation between compatible previews.

For the controlled fixture, support the normal ticket route contract used by:

```text
main
branch-sidebar
branch-inspector
```

When the user changes route or ticket context in one compatible preview:

1. The preview emits a validated navigation/context event.
2. The Studio records the canonical comparison context.
3. The Studio sends the equivalent context to the other compatible preview.
4. The receiving preview applies the navigation without creating an infinite message loop.

Prevent ping-pong synchronization.

Use an operation or transaction ID, source preview ID, or equivalent deterministic mechanism.

Do not infer route meaning from branch names.

---

## 6. Fixture and selected-entity synchronization

For the current controlled fixture, synchronize the selected ticket or equivalent fixture entity through an explicit supported adapter or contract.

This contract must be generic in structure and fixture-specific only in the adapter implementation.

Acceptable architecture:

```text
comparison context contract
→ fixture adapter
→ preview application
```

Unacceptable architecture:

```text
if branch name contains "sidebar", select TCK-102
```

The adapter must declare what it can synchronize.

Do not claim arbitrary Zustand, Redux, Context, or local component state synchronization.

The Studio should display which context dimensions are currently synchronized, such as:

```text
Route: synchronized
Selected ticket: synchronized
Viewport: synchronized
Local sidebar state: independent
```

---

## 7. Incompatible route behavior

Use `branch-incompatible-route` as a negative case.

The system must detect that its route or selected-entity contract is incompatible with the normal fixture branches.

It must not silently rewrite or guess.

Expected behavior:

```text
Route synchronization unavailable

branch-incompatible-route uses a different ticket navigation contract.
The preview remains interactive, but route and selected-ticket state will not
be synchronized with the other preview.
```

The preview may remain visible and independently usable.

The incompatibility must be based on explicit runtime capability/contract evidence, not the branch name.

---

## 8. Viewport synchronization

Provide a small set of deterministic viewport presets, for example:

* Desktop
* Tablet
* Mobile

Applying a preset should update both preview frames consistently.

Record the active viewport context centrally.

Do not attempt arbitrary device emulation.

The preview applications should receive equivalent available dimensions.

The comparison layout itself must remain usable.

---

## 9. Independent selection mode

The user must be able to select a supported React boundary in either preview.

Selection in preview A must not:

* clear preview B unless explicitly requested;
* overwrite preview B’s branch identity;
* reuse preview B’s runtime instance;
* accept stale metadata after preview A restarts;
* trigger normal application clicks.

The Studio must retain one active selection per preview.

Minimum selection summary:

```text
branch-sidebar
AppSidebar
src/features/navigation/AppSidebar.tsx:4:8
Exact

branch-inspector
ActivityFilters
src/features/tickets/ActivityFilters.tsx:3:8
Exact
```

Reuse the Prompt 002 source identity schema where possible.

Do not create a new weaker parallel representation.

---

## 10. Selection invalidation

A selection must be marked stale or cleared when:

* its preview restarts;
* its preview session changes;
* its source boundary is no longer present after navigation;
* the branch preview stops;
* the selection metadata fails validation.

The UI must explain why.

Example:

```text
Selection cleared

The branch-inspector preview restarted, so the previous runtime selection is
no longer valid.
```

Do not silently preserve runtime IDs across sessions.

A stable definition identity may be displayed as historical evidence, but it must not be treated as an active runtime selection.

---

## 11. Error and refusal separation

Separate these categories:

### Preview runtime failure

Examples:

* Vite process exited;
* preview failed to load;
* worktree startup failed.

### Bridge validation failure

Examples:

* malformed payload;
* stale session;
* mismatched preview identity.

### Synchronization refusal

Examples:

* incompatible route contract;
* fixture context unsupported;
* receiving preview cannot represent the selected entity.

### Selection refusal

Examples:

* no project-owned boundary;
* unsupported mapping pattern;
* malformed source metadata.

Do not collapse all failures into one generic error message.

---

# Architecture Requirements

## Central comparison state

Create a clear state model representing:

* active previews;
* ref and session identity;
* readiness;
* supported synchronization capabilities;
* canonical route/context;
* viewport preset;
* current selection per preview;
* errors and refusals.

Do not scatter synchronization state across unrelated React components.

Use the simplest existing state approach that preserves testability.

Do not add a major state-management dependency without evidence.

---

## Capability negotiation

Each preview must report the synchronization capabilities it supports.

Example conceptual capability payload:

```ts
{
  routeSync: {
    version: 1,
    contract: "ticket-query-v1"
  },
  fixtureContext: {
    version: 1,
    contract: "support-ticket-v1"
  },
  sourceSelection: {
    version: 1
  }
}
```

The exact implementation may differ.

The Studio compares capabilities before synchronizing.

Capability compatibility must not be inferred from branch names, commit messages, or hard-coded branch tables.

---

## Synchronization loop prevention

Implement deterministic loop prevention.

Test at least:

* route changed in preview A;
* Studio propagates to preview B;
* preview B updates;
* preview B does not cause an endless reflection back to preview A.

Do not rely only on timing or debouncing.

---

## Preview isolation

Each preview must maintain:

* its own window reference;
* its own origin;
* its own session identity;
* its own runtime selection state;
* its own errors;
* its own lifecycle.

One failing preview must not automatically terminate another healthy preview.

---

# Security and Safety Constraints

* Do not execute destructive Git commands against user branches.
* Do not delete unverified worktree paths.
* Do not trust unvalidated bridge data.
* Do not trust a branch name as identity.
* Do not use React Fiber or private React internals.
* Do not add fixture-specific production component maps.
* Do not use commit messages as synchronization or selection metadata.
* Do not modify generated fixture history.
* Do not weaken current tests or TypeScript settings.
* Do not disable failing tests.
* Do not hide errors with broad exception swallowing.
* Do not force synchronization when contracts are incompatible.
* Do not claim that arbitrary application state is synchronized.

---

# Required Tests

## Unit tests

Add tests for:

* preview/session identity creation;
* bridge schema validation;
* stale session rejection;
* mismatched preview rejection;
* unknown protocol rejection;
* capability compatibility;
* capability incompatibility;
* synchronization loop prevention;
* selection state isolation;
* selection invalidation after restart;
* canonical comparison-context updates.

## Component tests

Test the Studio UI for:

* two previews displayed;
* branch and status labels;
* independent selections;
* synchronization status;
* viewport preset changes;
* one preview failure without corrupting the other;
* clear incompatible-contract messaging.

## Integration and Playwright tests

At minimum, prove:

### Happy path

1. Start `branch-sidebar` and `branch-inspector`.
2. Display both simultaneously.
3. Navigate or select a ticket in one preview.
4. Confirm the other preview shows the equivalent ticket.
5. Change viewport preset.
6. Confirm both previews receive the same viewport context.
7. Enter selection mode.
8. Select `AppSidebar` from `branch-sidebar`.
9. Select `ActivityFilters` or `TicketInspector` from `branch-inspector`.
10. Confirm both selections appear simultaneously with accurate source identities.

### Reverse direction

Change route or selected ticket from the second preview and confirm the first preview synchronizes without a loop.

### Restart case

1. Make a selection.
2. Restart that preview.
3. Confirm the old selection is invalidated.
4. Confirm stale messages from the previous session are rejected.
5. Confirm the other preview remains healthy.

### Incompatible case

1. Start one normal branch and `branch-incompatible-route`.
2. Confirm both previews run.
3. Confirm route/context synchronization is explicitly unavailable.
4. Confirm no guessed route conversion occurs.
5. Confirm each preview remains independently interactive.

### Invalid bridge case

Inject or simulate:

* malformed message;
* mismatched preview ID;
* stale session ID.

Confirm each is rejected and does not alter Studio state.

---

# Existing Tests

All existing tests from Prompt 001 and Prompt 002 must remain passing.

Run the complete suite, not only new focused tests.

Required commands should include the existing equivalents of:

```text
npm run typecheck
npm test
npm run test:instrumentation
npm run test:preview-runtime
npm run test:e2e
npm run build
npm run fixture:verify
```

Add a dedicated command for multi-preview synchronization tests if appropriate.

---

# Manual Verification

Manually verify and capture evidence for:

1. `branch-sidebar` and `branch-inspector` running side by side.
2. Same ticket visible in both after navigation from the first preview.
3. Same ticket visible in both after navigation from the second preview.
4. Desktop, tablet, and mobile viewport synchronization.
5. `AppSidebar` selected from `branch-sidebar`.
6. `ActivityFilters` or `TicketInspector` selected from `branch-inspector`.
7. Both selections visible simultaneously.
8. One preview restarted and its old selection invalidated.
9. Other preview remaining healthy.
10. `branch-incompatible-route` showing explicit synchronization refusal.

Do not use screenshots as the only evidence. Confirm behavior through tests and source inspection.

---

# Documentation

Update:

* `/README.md`
* `/docs/product-brief.md`
* `/docs/decision-log.md`
* `/docs/risk-register.md`
* `/docs/limitations.md`
* `/docs/evaluation.md`

Create an ADR if the synchronization or capability architecture introduces a meaningful design decision.

Suggested ADR topic:

```text
Preview capability negotiation and versioned comparison context
```

Store this complete prompt at:

```text
/docs/codex-prompts/003-prove-multi-preview-synchronization.md
```

Document clearly:

* what synchronization is supported;
* what remains independent;
* how capability compatibility is determined;
* how loops are prevented;
* how sessions are invalidated;
* why incompatible previews are not forced into alignment.

---

# Anti-Cheating Audit

Before completion, search for and report any use of:

* branch-name parsing for behavior;
* hard-coded fixture branch tables;
* hard-coded sidebar or inspector source paths;
* component-to-file maps;
* commit-message parsing;
* fixture test imports in production code;
* manually prepared selection results;
* route conversion based on branch names;
* hidden global state shared across preview identities;
* disabled or weakened tests;
* production reliance on React private internals.

A fixture adapter may know the fixture’s explicit context contract.

It must not know that one named branch contains a sidebar and another contains an inspector.

---

# PASS Criteria

Recommend `PASS` only if all are true:

* two branch previews run simultaneously;
* each preview has isolated lifecycle and identity;
* route and fixture context synchronize for compatible branches;
* viewport presets synchronize;
* synchronization loops are prevented deterministically;
* incompatible route contracts are detected and explained;
* one supported component can be selected from each branch;
* both selections coexist in Studio state;
* source identities remain accurate;
* stale preview messages are rejected;
* selections invalidate correctly after restart;
* one preview failure does not corrupt the other;
* no branch-name or fixture-feature cheating exists;
* all previous and new tests pass;
* production builds remain free of development instrumentation where previously required;
* no generated fixture history is modified.

---

# MODIFY Criteria

Recommend `MODIFY` if the core architecture is sound but one or more bounded issues remain, such as:

* a synchronization loop edge case;
* incomplete restart invalidation;
* unclear incompatibility messaging;
* weak origin validation;
* insufficient responsive layout;
* missing failure-path coverage;
* capability detection that needs cleanup but is not fixture-cheating.

---

# ABANDON Criteria

Recommend `ABANDON` or replace the approach if:

* multiple previews cannot remain isolated reliably;
* route synchronization depends on branch names;
* preview messages can impersonate another preview;
* stale messages corrupt active Studio state;
* synchronization requires arbitrary app-specific hacks in the core runtime;
* incompatible contracts are silently forced;
* selection identities leak across previews;
* the architecture cannot support more than one preview without shared global confusion;
* tests only pass through hard-coded fixture behavior.

---

# Required Completion Report

Return a structured completion report containing:

1. Initial repository inspection.
2. Branch and worktree used.
3. Architecture implemented.
4. Files changed.
5. Preview/session identity design.
6. Bridge protocol and validation.
7. Capability negotiation design.
8. Route synchronization design.
9. Fixture-context synchronization design.
10. Viewport synchronization behavior.
11. Cross-branch selection behavior.
12. Loop-prevention mechanism.
13. Restart and stale-message behavior.
14. Incompatible-route refusal behavior.
15. Anti-cheating audit.
16. Commands run.
17. Initial failures found and how they were fixed.
18. Automated test results.
19. Manual verification evidence.
20. What has actually been proven.
21. What remains unproven.
22. Risks and limitations.
23. Commits created.
24. Final recommendation: `PASS`, `MODIFY`, or `ABANDON`.

Do not describe unfinished behavior as complete.

Do not proceed to dependency extraction or candidate-branch generation during this task.
