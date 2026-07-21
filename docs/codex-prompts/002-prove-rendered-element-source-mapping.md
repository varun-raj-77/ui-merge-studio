# Codex Prompt 002 — Prove Rendered React Element-to-Source Mapping

## Objective

Implement the next Phase 0 experiment for UI Merge Studio:

> Prove that a developer can click a rendered React component in a running branch preview and UI Merge Studio can identify the correct project-owned React source location without using fixture-specific component maps, branch names, commit messages, documentation, or manually maintained file lists.

This task is limited to:

* starting one generated fixture branch;
* instrumenting its React source during Vite development;
* showing the running application in a minimal preview shell;
* allowing the user to enter selection mode;
* highlighting eligible React component boundaries;
* recording the selected component’s source identity;
* displaying the mapping result for inspection.

Do not implement dependency extraction, merging, candidate branch generation, multi-branch comparison, or final Phase 0 verification.

---

## Repository context

The repository already contains:

* the controlled React + TypeScript + Vite fixture;
* `main`;
* `branch-sidebar`;
* `branch-inspector`;
* an incompatible route variation;
* fixture generation and verification;
* documentation and Phase 0 constraints.

The source-of-truth sentence is:

> Visually select preferred features from multiple running React branches and create one verified combined branch.

The current task tests only one prerequisite:

> Can a rendered React component be mapped back to its source reliably enough to support visual selection?

This task must remain a falsification experiment, not a polished product.

---

## Required working method

Before editing:

1. Inspect the repository and current documentation.
2. Read:

   * `/docs/product-brief.md`
   * `/docs/decision-log.md`
   * `/docs/risk-register.md`
   * `/docs/evaluation.md`
   * `/docs/limitations.md`
   * `/docs/adr/0001-phase-0-controlled-fixture-and-component-boundary.md`
3. Inspect the generated fixture structure and verify it is clean.
4. Report the existing architecture before changing it.
5. Preserve all existing behavior.
6. Use a new branch or isolated worktree for this task.
7. Do not modify generated fixture history except through the existing fixture-generation workflow.
8. Keep changes small and reviewable.
9. Do not weaken tests, types, or fixture anti-cheating constraints.

---

## Scope

Implement only the smallest system required to test element-to-source mapping.

Required flow:

```text
generated fixture branch
→ instrumented Vite development server
→ preview shell
→ iframe
→ selection mode
→ hover highlight
→ click eligible React boundary
→ source identity record
→ visible mapping result
```

For this task, support one preview at a time.

The user must be able to choose at least:

* `main`;
* `branch-sidebar`;
* `branch-inspector`.

The implementation may restart the preview when the branch changes.

Multi-preview side-by-side comparison is explicitly out of scope.

---

## Required architecture

Create only the minimum packages or applications needed.

Recommended structure:

```text
apps/
  studio/
    src/
      App.tsx
      preview/
      selection/
      bridge/

packages/
  repository-controller/
  preview-runtime/
  source-instrumentation/
  shared/
```

Equivalent structure is allowed when justified.

Do not create placeholder packages for later merge functionality.

---

## Preview execution

Implement a local preview controller that:

* accepts the generated fixture repository path;
* accepts a branch name from an explicit validated list supplied by repository inspection;
* creates or reuses an isolated temporary worktree;
* installs dependencies only when required;
* starts the Vite development server;
* assigns an available local port;
* exposes the preview URL to the Studio application;
* stops child processes cleanly;
* does not switch branches in the generated fixture’s primary working directory;
* does not infer behavior from branch-name semantics.

Branch names may be displayed to the user, but production logic must not parse names such as `sidebar` or `inspector` to determine source mappings.

Use host processes, not Docker.

---

## Instrumentation strategy

Implement a custom Vite transform plugin using a real JavaScript/TypeScript parser.

Preferred tools:

* Babel parser and traversal;
* or another justified AST-based transform compatible with React + TypeScript + Vite.

Do not use regex-based JSX transformation.

The transform must instrument project-owned React component output during development.

The instrumentation must attach enough metadata to eligible rendered boundaries to identify:

* absolute or repository-relative source file;
* line;
* column;
* component name when statically available;
* export identity when available;
* branch/worktree identity;
* stable runtime boundary identifier.

Suggested runtime metadata shape:

```ts
interface SourceIdentity {
  boundaryId: string;
  repositoryRelativePath: string;
  line: number;
  column: number;
  componentName: string | null;
  exportName: string | null;
}
```

The exact structure may differ when justified.

Do not expose machine-specific absolute paths to the browser UI when a repository-relative path is available.

---

## Eligible selection boundary

For Phase 0, define an eligible boundary as:

> The nearest project-owned React function component boundary that produces a selectable host DOM region.

A click must not mean arbitrary DOM pixels.

The selection system must:

1. detect the DOM element under the pointer;
2. resolve the nearest instrumented project-owned component boundary;
3. visually highlight that boundary;
4. allow walking to eligible ancestor component boundaries;
5. confirm one boundary;
6. send the source identity to the Studio shell;
7. display the recorded source identity.

Project-owned means source within the fixture repository, excluding:

* `node_modules`;
* React internals;
* Vite runtime code;
* the Studio shell;
* third-party components.

---

## Required component cases

The implementation must work for normal React composition, not only trivial one-element components.

Test at least these cases in the fixture:

### Case 1 — Simple component

A component rendering one host root.

Example:

```tsx
function TicketHeader() {
  return <header>...</header>;
}
```

### Case 2 — Nested components

Selecting an inner component must identify the inner boundary, while ancestor navigation can reach its parent.

Example:

```text
TicketInspector
└── TicketHeader
```

### Case 3 — Component with multiple host siblings

A component returning:

* a fragment;
* or multiple sibling elements.

The implementation must establish and document a defensible boundary representation.

Do not silently pretend fragments have one natural DOM root.

Possible acceptable strategies include:

* instrumenting each top-level host output with the same boundary identity;
* inserting a development-only wrapper only when semantics are preserved;
* refusing unsupported fragment shapes with an explicit explanation.

Choose one approach and document its tradeoffs.

### Case 4 — Wrapper component

A component that mainly delegates to another component must not destroy the ability to select meaningful project-owned descendants.

### Case 5 — Repeated component instances

Multiple instances of the same component must:

* map to the same source definition;
* have distinct runtime instance or boundary identifiers.

### Case 6 — Conditional rendering

A conditionally rendered component must be selectable when present.

### Case 7 — Forwarded props and event handlers

Instrumentation must preserve normal props, keyboard behavior, and event handling.

### Case 8 — Existing branch features

Source mapping must work on:

* baseline components;
* sidebar branch components;
* inspector branch components.

Do not add fixture-specific mappings for these components.

---

## Browser bridge

Implement a narrow `postMessage` bridge between the preview iframe and Studio shell.

Required message categories:

```text
preview-ready
selection-mode-enabled
selection-mode-disabled
boundary-hovered
boundary-selected
selection-error
runtime-error
```

Validate message origin and payload structure.

Use shared TypeScript schemas or runtime validation.

Do not accept arbitrary messages without validation.

Do not introduce a general-purpose event bus.

---

## Selection interface

Create a minimal Studio interface that includes:

* fixture branch selector;
* start/restart preview control;
* preview status;
* preview iframe;
* selection-mode toggle;
* current hovered boundary summary;
* selected boundary summary;
* ancestor navigation controls when available;
* clear-selection control;
* runtime error display.

The selected-boundary panel must show:

* component name;
* repository-relative file path;
* line and column;
* boundary ID;
* branch;
* whether the mapping is exact, partial, or refused.

No visual polish beyond clear usability is required.

---

## Source-location accuracy

A successful mapping must point to the source definition responsible for the selected React component boundary.

It must not merely point to:

* the generated JavaScript bundle;
* the JSX host element’s transformed location when the component definition is known;
* the parent page for every selection;
* the first matching component name;
* a manually configured file path.

For this task, source identity may originate from build-time AST instrumentation.

Source maps alone are not sufficient unless they demonstrably produce the required component-boundary mapping.

---

## Anti-cheating constraints

The mapping system must not use:

* branch-name parsing;
* commit messages;
* fixture documentation;
* fixture-generation overlays as source ownership manifests;
* test names;
* manually maintained component-to-file maps;
* hard-coded component names;
* hard-coded file paths for sidebar or inspector;
* DOM class names as source identity;
* React private internals such as Fiber traversal as the primary mechanism;
* development-only fixture attributes manually written into components;
* prepared JSON generated by fixture setup listing component ownership.

The AST instrumentation must operate generically on project-owned React source.

Fixture-specific tests may assert expected mappings, but production code must not import their expectations.

---

## Refusal behavior

Correct refusal is required when the source boundary cannot be mapped safely.

Examples:

* unsupported fragment shape under the chosen strategy;
* component created through an unsupported dynamic factory;
* source file outside the repository;
* metadata missing or malformed;
* conflicting boundary metadata;
* stale preview/runtime version mismatch.

A refusal must report:

* what could not be mapped;
* why;
* what evidence was available;
* whether the user may select a supported ancestor.

Do not guess.

---

## Tests

Add happy-path and failure-path tests.

### Instrumentation unit tests

Test:

* named function components;
* arrow function components;
* default exports;
* named exports;
* nested JSX;
* fragments;
* repeated component usage;
* conditional rendering;
* TypeScript props;
* existing `data-*` attributes;
* spread props;
* preservation of event handlers;
* exclusion of `node_modules`;
* stable repository-relative paths;
* absence of fixture-specific mappings.

Use fixture source snippets or temporary files.

Do not rely only on snapshots. Assert semantic transform behavior.

### Preview runtime tests

Test:

* worktree creation;
* port allocation;
* process startup;
* readiness detection;
* graceful shutdown;
* startup failure;
* occupied port recovery;
* dirty or missing generated fixture;
* invalid branch;
* child process cleanup.

Do not run destructive tests against the actual fixture repository.

### Bridge tests

Test:

* valid origin accepted;
* invalid origin rejected;
* valid payload accepted;
* malformed payload rejected;
* unknown message rejected;
* version mismatch rejected.

### Browser integration tests

Using Playwright, verify:

1. Studio starts the `main` preview.
2. Selection mode can be enabled.
3. Hovering a ticket header highlights the expected boundary.
4. Clicking records the correct source path and component.
5. Ancestor navigation can move from a nested child to its parent.
6. Repeated components produce distinct runtime boundary IDs.
7. The same repeated instances map to the same source definition.
8. Sidebar branch components map correctly.
9. Inspector branch components map correctly.
10. Existing application interactions still work while selection mode is disabled.
11. Selection mode does not accidentally activate normal navigation.
12. Unsupported cases produce an explicit refusal.
13. Runtime and console errors are surfaced.

At least one browser test must confirm that the reported line and column correspond to the actual fixture source.

---

## Verification commands

Add documented commands equivalent to:

```bash
npm install
npm run fixture:create
npm run fixture:verify
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Add focused commands where useful, such as:

```bash
npm run test:instrumentation
npm run test:preview-runtime
npm run test:studio
```

Run all relevant commands and report actual results.

Manually run the Studio application and inspect selections on:

* `main`;
* `branch-sidebar`;
* `branch-inspector`.

Do not claim manual verification unless it was actually performed.

---

## Documentation updates

Update:

```text
/docs/decision-log.md
/docs/risk-register.md
/docs/evaluation.md
/docs/limitations.md
```

Create:

```text
/docs/adr/0002-build-time-react-source-instrumentation.md
/docs/codex-prompts/002-prove-rendered-element-source-mapping.md
```

The ADR must cover:

* why AST instrumentation was selected;
* why React private internals were rejected;
* boundary semantics;
* fragment handling;
* runtime metadata;
* bridge validation;
* known unsupported patterns;
* removal or production-build behavior of instrumentation.

The evaluation document must include explicit PASS, MODIFY, and ABANDON criteria for this experiment.

---

## PASS criteria

This milestone passes only if:

1. A user can start a fixture branch preview through the Studio shell.
2. A user can enter selection mode.
3. Eligible project-owned component boundaries are visibly highlighted.
4. Clicking a rendered boundary reports the correct repository-relative source file.
5. Reported line and column are demonstrably accurate.
6. Nested components can be distinguished.
7. Eligible ancestors can be selected intentionally.
8. Repeated instances have distinct runtime IDs but the same source definition.
9. Mapping works on `main`, `branch-sidebar`, and `branch-inspector`.
10. Mapping is produced by generic AST instrumentation.
11. No fixture-specific component-to-file map exists.
12. Existing fixture behavior remains intact.
13. Unsupported mappings are explicitly refused instead of guessed.
14. Tests cover normal composition and failure paths.
15. The Studio and all affected fixture branches typecheck, test, and build successfully.

---

## MODIFY criteria

Recommend MODIFY rather than PASS when:

* mapping works only for components with one host root;
* fragments require a narrower documented selection contract;
* line accuracy is reliable but column accuracy is not;
* ancestor navigation is incomplete;
* wrapper components create ambiguity that can be handled by narrowing eligibility;
* the approach is viable but requires stricter instrumentation conventions.

Do not describe MODIFY results as a complete mapping solution.

---

## ABANDON criteria

Recommend ABANDON if:

* correct source mapping requires manually maintained component maps;
* mapping depends primarily on branch or fixture knowledge;
* ordinary nested React composition maps to the wrong component frequently;
* instrumentation changes application behavior materially;
* repeated instances cannot be distinguished;
* source identity becomes unreliable after Vite transforms;
* unsupported cases cannot be detected and explained;
* the approach depends on unstable React private internals;
* generated metadata is too incomplete to support later dependency analysis.

---

## Non-goals

Do not implement:

* two or more simultaneous previews;
* synchronized routes across previews;
* synchronized viewport or fixture state;
* dependency graph traversal;
* selected file calculation;
* selected hunk extraction;
* Git patch generation;
* branch merging;
* `combined-result`;
* incompatibility detection between branches;
* verification of merged behavior;
* visual regression;
* accessibility auditing beyond preserving fixture behavior;
* LLM assistance;
* production packaging;
* cloud execution;
* support for frameworks beyond the controlled React/Vite fixture.

Do not create fake placeholders for these features.

---

## Required completion report

Provide a structured report with:

### 1. Initial inspection

* repository state;
* relevant existing files;
* generated fixture state;
* branch/worktree used;
* assumptions.

### 2. Architecture implemented

* Studio shell;
* preview controller;
* instrumentation plugin;
* runtime boundary registry;
* iframe bridge;
* selection overlay;
* shared schemas.

### 3. Files changed

List every created, modified, and deleted file grouped by responsibility.

### 4. Source-mapping design

Explain:

* how components are detected;
* how metadata is injected;
* how boundaries are represented;
* how fragments are handled;
* how nested and repeated components work;
* how line and column are derived;
* how project-owned files are distinguished;
* how instrumentation is disabled or excluded from production builds.

### 5. Anti-cheating audit

Explicitly confirm whether any of the following exist:

* hard-coded fixture component names;
* hard-coded sidebar or inspector paths;
* component-to-file maps;
* branch-name parsing;
* commit-message parsing;
* fixture-overlay consumption by production code;
* test expectation imports;
* React private-internal traversal;
* manually added source attributes inside fixture components.

The expected answer is no for every item.

### 6. Commands run

List commands actually run and their results.

### 7. Automated results

Report separately:

* typecheck;
* instrumentation tests;
* preview runtime tests;
* bridge tests;
* Studio tests;
* Playwright tests;
* production build;
* fixture verification.

Include failures and fixes.

### 8. Manual verification

For each of:

* `main`;
* `branch-sidebar`;
* `branch-inspector`;

report the selected rendered component, returned source path, line, column, and whether the result was manually confirmed against source.

### 9. Refusal cases

Report each unsupported or refused case and the exact explanation shown.

### 10. Proven and unproven

Clearly state what this task proves.

Also state:

> This task does not prove dependency extraction, exclusion of unrelated branch changes, safe source integration, candidate branch generation, incompatibility detection, or the full Phase 0 product claim.

### 11. Risks and limitations

Include:

* unsupported React patterns;
* fragment limitations;
* wrapper ambiguity;
* metadata overhead;
* development-only assumptions;
* Windows path/process behavior;
* Vite-version sensitivity;
* remaining skeptical-review concerns.

### 12. Recommendation

Finish with exactly one:

* `PASS`
* `MODIFY`
* `ABANDON`

Justify the recommendation using evidence from this experiment.

Do not begin dependency extraction or the next milestone.

---

## Final instruction

Prove or falsify generic rendered React component-to-source mapping on the controlled fixture.

Do not broaden the scope.

Do not implement the merge engine.

Correct refusal is better than an inaccurate mapping.
