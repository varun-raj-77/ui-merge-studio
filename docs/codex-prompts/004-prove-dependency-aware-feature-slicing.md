# Codex Prompt 004 — Prove Dependency-Aware Feature Slice Extraction

## Objective

Extend UI Merge Studio so that a source-mapped React selection from a feature branch can be translated into a deterministic, explainable source-change slice containing the selected feature and its required supporting changes, while excluding unrelated branch changes.

This task must prove the central technical hypothesis:

> A visual React selection can be traced from its rendered component boundary to a dependency-aware set of branch changes without requiring the user to manually provide filenames.

The task succeeds only if UI Merge Studio can analyze the selected features from:

* `branch-sidebar`
* `branch-inspector`

and produce separate feature slices that:

1. Begin from the visual source selection.
2. Compare the selected branch against the correct common ancestor.
3. Identify required changed symbols and files.
4. Include supporting components, hooks, types, styles, assets, imports, and tests when demonstrably required.
5. Exclude unrelated changes intentionally present in the same branch history.
6. Explain every included and excluded item.
7. Refuse or mark unresolved cases when evidence is insufficient.

Do not create `combined-result` in this task.

Do not apply the slices to a candidate branch.

---

# Repository Context

Repository: UI Merge Studio

Current proven milestones:

## Prompt 001 — Controlled fixture foundation

Proven:

* deterministic React + TypeScript + Vite fixture generation;
* fixture branches:

  * `main`
  * `branch-sidebar`
  * `branch-inspector`
  * `branch-incompatible-route`;
* meaningful feature changes;
* supporting source files;
* intentionally unrelated changes;
* clean and reproducible fixture history.

## Prompt 002 — Rendered element-to-source mapping

Proven:

* development-time AST instrumentation;
* supported React function-component boundary mapping;
* source file, definition position, component identity, and confidence;
* nested boundary navigation;
* repeated runtime-instance identity;
* explicit refusal behavior;
* no React private-internal traversal;
* no production instrumentation leakage.

## Prompt 003 — Multi-preview synchronization

Proven:

* two isolated branch previews;
* independent worktree/process/session identities;
* route and selected-ticket synchronization;
* viewport synchronization;
* capability negotiation;
* independent source-mapped selections;
* stale-session rejection;
* incompatible-contract refusal;
* simultaneous selection of:

  * `AppSidebar` from `branch-sidebar`;
  * `ActivityFilters` from `branch-inspector`.

Current branch containing Prompt 003:

```text
codex/phase0-multi-preview-sync
```

Inspect the current repository and commit history before making changes.

Work on a new isolated branch from the completed Prompt 003 state.

Suggested branch:

```text
codex/phase0-dependency-slices
```

Do not modify generated fixture history.

---

# Core User Story

A developer runs:

* `branch-sidebar`
* `branch-inspector`

side by side.

The developer visually selects:

```text
branch-sidebar
AppSidebar
```

and:

```text
branch-inspector
ActivityFilters
```

UI Merge Studio then analyzes each selection and produces an explainable feature slice.

Conceptual example:

```text
AppSidebar selection
├── selected component definition
├── supporting navigation hook
├── supporting type
├── required stylesheet rules
├── required import/export changes
├── required parent integration change
├── relevant feature test
└── excludes unrelated branch modification
```

The developer must not manually specify source filenames.

---

# Primary Experiment

For each selected branch:

1. Resolve the branch commit and merge base against `main`.
2. Compute changed files and changed source regions.
3. Start from the selected component definition identity.
4. Resolve its static dependencies.
5. Determine which branch changes are required for the selected feature to exist and function.
6. Trace required integration points into project-owned parents, routes, exports, or application composition.
7. Include relevant tests and styles through explicit evidence.
8. Exclude unrelated changed files and symbols.
9. Produce a machine-readable slice and a human-readable explanation.
10. Refuse unresolved or unsafe boundaries instead of inventing certainty.

This must be driven by source analysis and Git evidence, not by branch names or fixture-specific feature tables.

---

# Scope

## Required

Implement:

* merge-base and branch-diff analysis;
* changed-file classification;
* TypeScript/TSX AST symbol indexing;
* project-owned static import graph;
* export and re-export resolution for supported patterns;
* selected-component seed resolution;
* changed-symbol identification;
* dependency traversal constrained by branch changes;
* parent/integration-edge discovery;
* CSS dependency evidence for supported styles;
* relevant test discovery through supported import relationships;
* inclusion reasons;
* exclusion reasons;
* unresolved-dependency reporting;
* deterministic slice output;
* per-preview slice analysis;
* Studio visualization of slice results;
* machine-readable persisted or downloadable analysis artifact;
* automated positive and negative tests;
* anti-cheating audit;
* documentation of limitations.

## Explicitly excluded

Do not implement:

* applying slices to another branch;
* candidate branch generation;
* `combined-result`;
* source mutation;
* AST merge transforms;
* import reconciliation on a candidate;
* conflict resolution;
* LLM-authored merge patches;
* runtime verification of a combined branch;
* arbitrary semantic dependency inference;
* backend-service merging;
* monorepo support;
* framework support beyond current React/TypeScript/Vite scope;
* generalized CSS-in-JS analysis unless already supported with direct static evidence.

---

# Dependency Slice Definition

A feature slice is not merely a list of changed files.

It must represent evidence-backed source changes required by the selected rendered feature.

Each slice must contain:

```ts
type FeatureSlice = {
  version: number;
  repository: {
    baseRef: string;
    branchRef: string;
    mergeBaseCommit: string;
    branchCommit: string;
  };
  selection: SourceIdentity;
  status: "resolved" | "partial" | "refused";
  includedChanges: IncludedChange[];
  excludedChanges: ExcludedChange[];
  unresolvedDependencies: UnresolvedDependency[];
  evidence: SliceEvidence[];
};
```

The exact schema may differ, but it must preserve equivalent information.

Each included item must identify:

* repository-relative path;
* change category;
* symbol or source region when available;
* branch-relative change identity;
* reason for inclusion;
* evidence edge that caused inclusion;
* confidence;
* whether the entire file or only specific changed regions are required.

Each excluded changed item must identify:

* path;
* symbol or region when available;
* reason for exclusion;
* whether exclusion is proven or merely not currently connected.

Do not label something “safe to exclude” when the analyzer only failed to find a connection.

Distinguish:

```text
proven unrelated
```

from:

```text
not reached by supported analysis
```

---

# Supported Dependency Categories

At minimum, analyze the following where statically determinable.

## 1. Selected component definition

The visual source identity from Prompt 002 is the initial seed.

Validate:

* branch;
* preview/session evidence;
* repository-relative path;
* definition boundary;
* component name;
* current source contents;
* selected definition still exists.

Reject stale or mismatched selection evidence.

---

## 2. Static project imports

Resolve project-owned static imports such as:

```ts
import { useNavigation } from "../../hooks/useNavigation";
import type { Ticket } from "../../types/ticket";
import "./sidebar.css";
```

Support:

* relative imports;
* TypeScript path aliases already configured in the fixture, if any;
* named imports;
* default imports;
* namespace imports;
* type-only imports;
* supported barrel-file re-exports.

External packages may be recorded as external dependencies, but must not be copied into the slice.

---

## 3. Changed symbols

Do not include an entire changed file automatically when only one independently analyzable changed symbol is required.

Build a supported symbol model for:

* function declarations;
* function components;
* arrow-function declarations;
* variable declarations;
* interfaces;
* type aliases;
* enums;
* constants;
* named exports;
* default exports;
* static re-exports.

When a file-level change cannot be safely separated, mark it as requiring the whole file and explain why.

---

## 4. Component composition

Follow statically resolved project-owned JSX component references from the selected component.

Example:

```tsx
<AppSidebarItem />
```

may require the changed definition of `AppSidebarItem`.

Do not infer ownership from DOM ancestry alone.

Use source imports and symbol resolution.

---

## 5. Integration edges

A selected component may depend on a parent change that introduces it into the running application.

For example:

```tsx
<TicketPage>
  <AppSidebar />
</TicketPage>
```

The slice must identify the changed parent integration point that causes the selected feature to render.

This reverse edge is essential.

A dependency walk that starts at `AppSidebar` and only follows its outgoing imports is insufficient.

The analyzer must identify supported branch changes that:

* import the selected component;
* render it;
* export it through a required barrel;
* register it in a route or composition boundary;
* connect it to supported state or fixture context.

Do not include every importer automatically.

Include the smallest supported changed integration chain needed to connect the feature to an existing base application boundary.

---

## 6. Hooks, utilities, state, and types

Follow statically resolved project-owned dependencies required by included changed symbols.

Support conventional cases in the controlled fixture, including:

* hooks;
* utility functions;
* state modules;
* constants;
* interfaces and type aliases;
* fixture-related selectors;
* directly imported schemas.

Avoid claiming arbitrary runtime-state dependency comprehension.

---

## 7. Styles

Support direct stylesheet evidence such as:

```ts
import "./AppSidebar.css";
```

or an equivalent existing fixture convention.

The slice must include required changed stylesheet files or supported changed rules.

If safe rule-level extraction is not implemented, include the entire stylesheet and explain the limitation.

Do not infer styles merely because class names look similar across files unless a supported deterministic relationship exists.

Record unsupported style mechanisms as unresolved.

---

## 8. Assets

Include project-owned assets when imported by included source:

* SVG;
* images;
* local fonts referenced by supported stylesheet imports;
* other static Vite assets.

Do not include unused changed assets.

---

## 9. Tests

Identify relevant changed tests through deterministic evidence.

Supported evidence may include:

* a changed test imports the selected component;
* a changed test imports an included supporting symbol;
* a changed test targets the same feature module through a supported direct relationship.

Do not include every branch test.

Do not use test titles alone as proof.

---

# Git Change Model

Use Git as the source of truth for what differs between the selected branch and the base.

For each branch:

1. Resolve the branch commit.
2. Resolve the merge base with `main`.
3. Obtain status and patch data.
4. Classify:

   * added files;
   * deleted files;
   * modified files;
   * renamed files, if supported;
   * binary changes;
   * unsupported changes.
5. Associate changed AST symbols or regions with diff hunks.

The feature slice should select from branch changes.

Do not treat unchanged base dependencies as changes to copy.

However, unchanged dependencies may appear in the evidence graph to explain how included branch changes connect to the base application.

Clearly distinguish:

```text
required existing base dependency
```

from:

```text
required branch change
```

---

# Smallest-Slice Principle

The analyzer should seek the smallest evidence-supported change set that preserves the selected feature within the controlled fixture.

But it must prefer conservative inclusion over unsafe partial extraction.

Example:

* If one changed exported function can be isolated safely, include that symbol-level change.
* If two changed declarations share initialization or module-level side effects that cannot be separated safely, include the whole file.
* If a style file cannot be split confidently, include the whole style file.
* If a required integration change shares one inseparable JSX region with unrelated behavior, mark the slice partial or refused rather than pretending separation is safe.

Correct refusal is better than a falsely minimal slice.

---

# Expected Positive Results

## `branch-sidebar`

Starting from the visual `AppSidebar` selection, the slice must include all fixture changes required for the sidebar feature, including its supported dependencies and integration point.

It must exclude the intentionally unrelated change in the same branch.

Do not hard-code expected filenames in production analysis.

Tests may assert fixture-specific expected results.

## `branch-inspector`

Starting from `ActivityFilters`, the analyzer must determine the feature boundary required to preserve the selected filter behavior.

It must include required supporting source changes, styles, types, state, and tests based on actual evidence.

It must exclude the intentionally unrelated branch change.

The analyzer may discover that `ActivityFilters` alone requires an ancestor or integration chain. That is acceptable if explained deterministically.

---

# Selection-Boundary Escalation

The selected definition may be too narrow to represent a functioning feature.

Example:

```text
ActivityFilters
```

may require:

```text
TicketActivityList
→ TicketInspector
→ TicketPage integration
```

Implement explicit boundary escalation.

Possible statuses:

```text
Selected boundary sufficient
```

```text
Expanded to required integration boundary
```

```text
Partial: unresolved integration dependency
```

```text
Refused: no safe changed integration chain
```

Do not silently broaden the feature.

The Studio must show:

* original visual selection;
* final analyzed feature boundary;
* why expansion occurred;
* which additional changes became necessary.

---

# Exclusion Analysis

Every changed branch item not included in the slice must be classified.

Suggested categories:

* proven unrelated to supported feature graph;
* unreachable changed symbol in an otherwise included file;
* unrelated changed file;
* unsupported analysis;
* ambiguous shared region;
* external or generated artifact;
* ignored build output.

The fixture’s intentionally unrelated changes must be excluded with affirmative evidence.

Do not call something unrelated merely because its filename differs from the feature.

---

# Refusal and Partial Cases

Implement explicit refusal or partial analysis for cases such as:

* stale source selection;
* selected source is unchanged from base and no changed integration chain is found;
* dynamic import that cannot be resolved;
* computed module path;
* unsupported re-export;
* unresolved alias;
* dynamic component factory;
* ambiguous HOC ownership;
* shared changed source region containing inseparable unrelated behavior;
* stylesheet relationship cannot be established;
* deleted required dependency;
* cyclic changed dependency graph that cannot be safely classified;
* binary dependency without supported handling;
* source outside repository;
* source branch changed after selection;
* branch does not descend from the expected fixture history.

A refusal must report:

* reason;
* evidence gathered;
* unresolved edge;
* possible manual next step;
* whether choosing an ancestor boundary could help.

Do not fabricate a slice after refusal.

---

# Studio Interface

Extend the comparison workspace with a focused feature-slice panel.

For each selected preview, show:

* branch;
* original selected component;
* analyzed feature boundary;
* status;
* included changed files/symbols;
* inclusion reason;
* excluded changed files/symbols;
* unresolved dependencies;
* confidence;
* merge base and analyzed branch commit.

Allow the user to trigger analysis only after a valid selection exists.

Do not automatically start candidate generation.

Suggested presentation:

```text
branch-sidebar · AppSidebar
Status: Resolved

Included changes
✓ AppSidebar component
✓ Navigation item component
✓ Sidebar stylesheet
✓ TicketPage integration
✓ Sidebar feature test

Excluded branch changes
– Unrelated analytics text change
  Reason: changed symbol has no supported dependency or integration edge
```

The actual fixture evidence must determine the displayed entries.

---

# Machine-Readable Artifact

Produce a deterministic JSON artifact for each analysis.

Suggested location:

```text
.ums/analysis/<analysis-id>/feature-slice.json
```

Do not commit runtime artifacts by default.

The artifact must include:

* schema version;
* repository identity;
* branch commit;
* merge base;
* selection identity;
* analysis timestamp only if it does not affect deterministic comparisons;
* included changes;
* excluded changes;
* evidence edges;
* unresolved dependencies;
* final status.

For repeatability tests, either omit nondeterministic values or normalize them.

Repeated analysis against the same repository state and selection must produce equivalent normalized results.

---

# Architecture Requirements

## Source index

Build a reusable repository source index rather than running disconnected regular-expression scans.

At minimum, model:

* modules;
* imports;
* exports;
* declarations;
* JSX references;
* changed symbols;
* stylesheet imports;
* asset imports;
* test relationships.

Use the TypeScript compiler API or another existing deterministic AST mechanism.

Do not add an LLM dependency.

Do not parse TypeScript/TSX primarily with regular expressions.

Regular expressions may be used only for narrow non-language tasks where safe.

---

## Dependency graph

Represent evidence as typed graph edges.

Suggested conceptual edge types:

```text
imports-symbol
imports-module
renders-component
exported-through
integrated-by
uses-hook
uses-type
imports-style
imports-asset
tested-by
changed-within
```

Each included change must be reachable through recorded evidence.

Avoid one generic “depends-on” edge that hides reasoning.

---

## Changed-region mapping

Associate Git diff hunks with AST declarations where supported.

Account for:

* added declarations;
* modified declarations;
* removed declarations;
* module-level import/export changes;
* JSX insertion into an existing component;
* style-file changes.

If a hunk spans multiple declarations or cannot be separated safely, report file-level inclusion or ambiguity.

---

## Determinism

The same branch state and selection must produce the same normalized slice.

Ensure stable ordering for:

* files;
* symbols;
* evidence edges;
* unresolved dependencies;
* exclusions.

Do not rely on filesystem iteration order.

---

## Caching

Caching is optional.

If introduced, cache keys must include:

* repository identity;
* merge-base commit;
* branch commit;
* analyzer schema/version;
* selection definition identity.

Never reuse an analysis across different branch commits merely because paths match.

---

# Security and Repository Safety

* Do not modify feature branches.
* Do not modify generated fixture history.
* Do not apply source patches.
* Do not create `combined-result`.
* Do not delete user files.
* Do not run destructive Git commands.
* Analyze only repository-owned paths.
* Prevent path traversal outside the repository root.
* Do not execute imported source code.
* Do not rely on lifecycle execution for source analysis.
* Do not trust preview-provided paths without repository validation.
* Do not use branch names as feature semantics.
* Do not use commit messages as dependency evidence.
* Do not import fixture expected-output manifests into production code.

---

# Required Tests

## Unit tests

Add tests for:

* merge-base resolution;
* changed-file classification;
* changed-symbol mapping;
* static relative import resolution;
* named and default export resolution;
* supported barrel re-export resolution;
* JSX component-reference resolution;
* reverse integration-edge discovery;
* type-only dependency handling;
* stylesheet dependency inclusion;
* asset dependency inclusion;
* relevant-test discovery;
* stable graph ordering;
* cycle handling;
* whole-file fallback;
* unresolved import handling;
* path traversal rejection;
* stale selection rejection;
* branch commit mismatch;
* deterministic normalized output.

---

## Fixture-specific feature-slice tests

Tests may contain expected fixture results.

Production code may not.

### Sidebar slice

Using a source identity corresponding to `AppSidebar` on `branch-sidebar`, assert:

* required feature changes are included;
* required integration change is included;
* supporting styles and tests are included when evidenced;
* intentionally unrelated branch change is excluded;
* no inspector-specific changes appear;
* result is deterministic.

### Inspector slice

Using a source identity corresponding to `ActivityFilters` on `branch-inspector`, assert:

* required filter/inspector changes are included;
* required integration boundary is identified;
* supporting dependencies and relevant tests are included;
* intentionally unrelated branch change is excluded;
* no sidebar-specific changes appear;
* boundary escalation is explained when required;
* result is deterministic.

---

## Failure-path fixture

Use or add a controlled unsupported dependency case without altering existing generated history improperly.

Possible approach:

* extend the deterministic fixture generator and regenerate expected fixture history only if the repository’s existing process explicitly permits it;
* otherwise create an isolated temporary Git repository inside the test.

Test a feature whose required dependency is dynamically resolved or inseparably mixed with unrelated behavior.

Expected outcome:

```text
partial
```

or:

```text
refused
```

with explicit evidence.

Do not hard-code successful output for the failure case.

---

## Studio component tests

Test:

* analysis disabled without selection;
* analysis starts for the correct preview;
* loading state;
* resolved slice display;
* included and excluded sections;
* original versus expanded boundary;
* partial result display;
* refusal display;
* stale result invalidation after preview restart;
* branch commit mismatch;
* analyses remain independent between previews.

---

## Playwright integration

At minimum:

### Sidebar analysis

1. Start `branch-sidebar` and `branch-inspector`.
2. Select `AppSidebar`.
3. Run dependency analysis.
4. Confirm resolved status.
5. Confirm feature-supporting entries appear.
6. Confirm the intentionally unrelated sidebar-branch change appears under excluded changes.
7. Confirm no manual filename input was used.

### Inspector analysis

1. Select `ActivityFilters`.
2. Run dependency analysis.
3. Confirm the final analyzed feature boundary.
4. Confirm required supporting changes appear.
5. Confirm the intentionally unrelated inspector-branch change is excluded.
6. Confirm the sidebar analysis remains intact.

### Determinism

Run the same analysis twice against unchanged commits.

Confirm equivalent normalized results.

### Restart invalidation

1. Analyze a selected feature.
2. Restart the preview.
3. Confirm the runtime selection is invalidated.
4. Confirm the old analysis is marked stale or removed.
5. Confirm it cannot be applied to the new session without re-selection.

### Unsupported case

Run analysis against the controlled unsupported case.

Confirm explicit partial/refused status and evidence.

---

# Existing Verification

All previous tests must continue to pass.

Run at least the repository’s equivalents of:

```text
npm run typecheck
npm test
npm run test:instrumentation
npm run test:preview-runtime
npm run test:multi-preview
npm run test:e2e
npm run build
npm run fixture:verify
```

Add dedicated commands such as:

```text
npm run test:source-analysis
npm run test:feature-slice
```

if appropriate.

Do not weaken prior assertions.

Do not disable flaky tests.

Fix root causes.

---

# Manual Verification

Manually inspect and document:

1. `AppSidebar` visual selection.
2. Sidebar slice analysis.
3. Included supporting files and symbols.
4. Excluded unrelated sidebar branch change.
5. Evidence path from selection to integration point.
6. `ActivityFilters` visual selection.
7. Inspector slice analysis.
8. Any boundary escalation.
9. Included supporting dependencies and tests.
10. Excluded unrelated inspector branch change.
11. Deterministic repeated output.
12. Explicit partial/refusal output for unsupported dependency patterns.

Compare each included and excluded item directly with:

* Git diff;
* source imports;
* JSX composition;
* tests;
* fixture behavior.

Screenshots alone are insufficient.

---

# Anti-Cheating Audit

Search production code for:

* `branch-sidebar`;
* `branch-inspector`;
* expected feature filenames;
* `AppSidebar`;
* `ActivityFilters`;
* fixture-specific include lists;
* fixture-specific exclusion lists;
* component-to-feature maps;
* commit-message parsing;
* branch-name parsing;
* imported fixture test expectations;
* precomputed dependency manifests;
* manually authored feature slices;
* hidden allowlists;
* React private internals;
* disabled tests;
* broad `any` types introduced to bypass analysis correctness;
* regex-based TypeScript parsing used as the primary analyzer.

Fixture-specific names may appear in tests and documentation.

They must not control production analysis.

---

# PASS Criteria

Recommend `PASS` only if all are true:

* analysis starts from a real source-mapped visual selection;
* no manual filename selection is required;
* merge base and branch commits are validated;
* a deterministic project source index is built;
* selected symbols are resolved through AST evidence;
* static dependencies are traced;
* reverse integration edges are identified;
* required feature-supporting changes are included;
* relevant styles, types, assets, and tests are included when evidenced;
* intentionally unrelated sidebar changes are excluded;
* intentionally unrelated inspector changes are excluded;
* every included item has an evidence-backed reason;
* excluded items distinguish proven unrelated from unsupported/unreached;
* boundary escalation is explicit;
* unsupported cases are partial or refused honestly;
* normalized repeated results are deterministic;
* analyses remain isolated per preview;
* stale analyses cannot survive branch/session changes incorrectly;
* no production fixture cheating exists;
* all previous and new tests pass;
* fixture history remains clean;
* no candidate branch or merged output is created.

---

# MODIFY Criteria

Recommend `MODIFY` if the architecture is sound but bounded issues remain, such as:

* incomplete supported barrel resolution;
* stylesheet analysis conservatively includes a whole file;
* one evidence category lacks clear UI explanation;
* test association requires a better supported rule;
* deterministic output differs only through removable metadata;
* a valid slice is partial because one supported dependency edge is missing.

Do not recommend PASS when unrelated fixture changes remain included without necessity.

---

# ABANDON Criteria

Recommend `ABANDON` or replace the approach if:

* feature slices are effectively whole-branch file lists;
* manually prepared fixture maps drive the result;
* branch names determine expected dependencies;
* every selected feature requires manual filename input;
* reverse integration edges cannot be found;
* unrelated same-branch changes cannot be excluded;
* dependency analysis relies primarily on filenames or naming similarity;
* an LLM generates the dependency list without deterministic evidence;
* results vary nondeterministically;
* the analyzer claims confidence when dependencies are unresolved;
* the implementation silently treats every changed file as required.

---

# Required Documentation

Update:

* `/README.md`
* `/docs/product-brief.md`
* `/docs/decision-log.md`
* `/docs/risk-register.md`
* `/docs/limitations.md`
* `/docs/evaluation.md`

Create an ADR for the source-analysis architecture.

Suggested ADR:

```text
/docs/adr/0004-ast-and-git-evidence-feature-slicing.md
```

Store this complete prompt at:

```text
/docs/codex-prompts/004-prove-dependency-aware-feature-slicing.md
```

Document clearly:

* the feature-slice definition;
* supported symbol patterns;
* graph edge types;
* whole-file fallback rules;
* boundary escalation;
* exclusion semantics;
* unresolved dependency handling;
* why analysis does not yet mean safe integration;
* which fixture-specific results were proven.

---

# Required Completion Report

Return a structured completion report containing:

1. Initial repository inspection.
2. Branch and worktree used.
3. Existing architecture reused.
4. New source-analysis architecture.
5. Files changed.
6. Git merge-base and diff model.
7. AST module and symbol index.
8. Import/export resolution.
9. Changed-symbol mapping.
10. Forward dependency traversal.
11. Reverse integration-edge discovery.
12. Style, asset, type, and test handling.
13. Feature-boundary escalation.
14. Whole-file fallback rules.
15. Exclusion classification.
16. Partial and refusal behavior.
17. Machine-readable slice schema.
18. Determinism strategy.
19. Studio interface behavior.
20. Sidebar slice result.
21. Inspector slice result.
22. Intentionally unrelated changes excluded.
23. Unsupported-case result.
24. Anti-cheating audit.
25. Commands run.
26. Initial failures and fixes.
27. Automated test results.
28. Manual source and Git verification.
29. What has actually been proven.
30. What remains unproven.
31. Risks and limitations.
32. Commits created.
33. Final recommendation: `PASS`, `MODIFY`, or `ABANDON`.

Do not proceed to candidate branch generation during this task.

Do not describe a partial dependency graph as a safe merge plan.

Do not claim the complete Phase 0 product has been proven.
