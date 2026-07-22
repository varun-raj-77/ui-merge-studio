# Codex Prompt 004B — Prove Safe Mixed-File and Test-Case Slicing

## Objective

Extend the existing Prompt 004 dependency-slicing implementation so UI Merge Studio can safely separate relevant and unrelated changes that coexist inside the same changed test file.

This is a corrective milestone, not a new product phase.

The specific blocker is:

> The inspector test file contains both relevant inspector/filter coverage and unrelated sorting coverage. The current analyzer includes the whole file conservatively, so Prompt 004 cannot yet receive PASS.

The goal of Prompt 004B is to implement declaration- and test-case-level slicing for supported TypeScript and TSX test files.

The implementation must:

1. Identify individual changed test declarations and supporting declarations.
2. Include only tests relevant to the selected feature.
3. Include required imports, shared setup, fixtures, helpers, and hooks.
4. Exclude unrelated changed tests in the same file.
5. Refuse or remain partial when safe separation cannot be proven.
6. Preserve every previously passing Prompt 001–004 behavior.
7. Avoid candidate-branch generation or patch application.

Do not create `combined-result`.

---

# Repository Context

Repository: UI Merge Studio

Current branch with Prompt 004 implementation:

```text
codex/phase0-dependency-slices
```

Prompt 004 commits include:

```text
c152cab — feat: add dependency-aware feature slice analysis
8d2009b — docs: record dependency slicing experiment
7fa0031 — test: prove existing base integration evidence
```

Current Prompt 004 status:

```text
MODIFY
```

Reason:

* production dependency slicing works;
* unrelated production changes are excluded;
* sidebar feature slicing resolves correctly;
* inspector feature slicing resolves correctly;
* `ActivityFilters` expands to `TicketInspector`;
* the inspector test file is included as a whole;
* that file contains both relevant inspector coverage and unrelated sorting coverage.

Work on a new isolated branch from the completed Prompt 004 state.

Suggested branch:

```text
codex/phase0-test-case-slicing
```

Inspect the repository and current analyzer before changing anything.

Do not modify generated fixture history.

---

# Core Hypothesis

For supported test files, a changed file can be represented as a set of analyzable test units rather than one indivisible file.

Conceptually:

```text
changed test module
├── imports
├── shared fixtures
├── helper declarations
├── beforeEach / afterEach hooks
├── describe block A
│   ├── relevant inspector test
│   └── relevant filter test
└── describe block B
    └── unrelated sorting test
```

Starting from an included production feature, the analyzer should include:

* relevant test declarations;
* only the setup and helpers they require;
* required imports;
* required enclosing `describe` structure when needed.

It should exclude unrelated test declarations in the same file.

---

# Scope

## Required

Implement:

* AST indexing for supported test declarations;
* Git-hunk association with individual test units;
* test-unit dependency relationships;
* support for `describe`, `test`, `it`, and supported variants;
* support for top-level and nested lifecycle hooks;
* support for statically referenced local helpers;
* support for statically referenced test fixtures and constants;
* required import calculation;
* unused-import prevention in generated slice representation;
* mixed relevant/unrelated test classification;
* conservative handling of shared setup;
* deterministic test-slice output;
* explicit whole-file fallback conditions;
* explicit partial/refusal conditions;
* fixture-backed positive and failure tests;
* Studio explanation of partial test slicing;
* documentation and anti-cheating audit.

## Excluded

Do not implement:

* source patch application;
* rewritten physical test files;
* candidate branches;
* `combined-result`;
* arbitrary JavaScript control-flow analysis;
* runtime test execution tracing;
* coverage-guided dependency inference;
* LLM-generated test slicing;
* Jest internals inspection;
* Vitest runtime instrumentation;
* semantic interpretation of test names;
* arbitrary snapshot splitting;
* test framework support beyond the patterns present in the controlled fixture and clearly supported conventional forms.

---

# Definition of a Test Slice

Add or extend the machine-readable schema so a test-file inclusion can express units smaller than a whole file.

Conceptual schema:

```ts
type TestFileSlice = {
  path: string;
  mode: "whole-file" | "test-units" | "partial" | "refused";
  includedUnits: TestUnitChange[];
  excludedUnits: TestUnitChange[];
  requiredImports: ImportRequirement[];
  requiredSupportDeclarations: SupportDeclaration[];
  unresolvedDependencies: UnresolvedDependency[];
  evidence: SliceEvidence[];
};
```

A supported test unit may represent:

```ts
type TestUnitKind =
  | "describe"
  | "test"
  | "it"
  | "beforeEach"
  | "afterEach"
  | "beforeAll"
  | "afterAll"
  | "helper"
  | "fixture"
  | "constant";
```

The exact schema may differ, but it must preserve equivalent evidence.

Each included test unit must identify:

* repository-relative path;
* declaration kind;
* static title when available;
* source start and end;
* changed hunks associated with it;
* reason for inclusion;
* dependency edges;
* confidence;
* required enclosing structure.

Each excluded changed test unit must identify:

* source location;
* declaration kind;
* reason for exclusion;
* whether exclusion is proven or only unsupported/unreached.

Do not rely on the test title as the primary dependency relationship.

---

# Supported Test Syntax

Support the conventional patterns present in the fixture and common TypeScript test code.

At minimum:

```ts
test("...", () => {});
it("...", () => {});
describe("...", () => {});
```

Support statically recognizable modifiers where feasible:

```ts
test.each(...)
it.each(...)
test.concurrent(...)
it.concurrent(...)
```

Modifiers may be marked unsupported if safe extraction is not implemented, but they must not be silently interpreted incorrectly.

Support nested `describe` blocks.

Support lifecycle hooks:

```ts
beforeEach(...)
afterEach(...)
beforeAll(...)
afterAll(...)
```

Support locally declared:

* helper functions;
* arrow-function helpers;
* fixture constants;
* mock data;
* setup functions;
* statically referenced imported helpers.

Do not treat arbitrary callback calls as tests merely because they accept a function.

---

# Test-Unit Index

Extend the reusable AST source index rather than creating a disconnected parser.

For each supported test module, index:

* imports;
* top-level declarations;
* `describe` hierarchy;
* individual test declarations;
* lifecycle hooks;
* helper declarations;
* fixture declarations;
* static identifier references;
* source ranges;
* changed hunks;
* enclosing scopes.

Do not parse TypeScript or test syntax primarily with regular expressions.

Use the existing AST approach.

---

# Relevance Evidence

A changed test unit may be included when deterministic evidence connects it to an included production feature.

Supported evidence may include:

1. The test directly imports an included production symbol.
2. The test renders an included React component.
3. The test statically references an imported included symbol.
4. The test references a local helper that references an included symbol.
5. The test depends on a fixture or helper transitively required by another included test.
6. The test is inside a `describe` block that provides required shared setup for included descendants.
7. The test verifies an included hook, utility, state module, type-level fixture, or integration component through static imports.

Do not include a test merely because:

* its title contains “inspector,” “filter,” or “sidebar”;
* it lives in a similarly named directory;
* it changed in the same commit;
* it shares the same branch;
* it appears in an expected fixture list.

---

# Dependency Analysis Within Test Files

Build dependency relationships between test units and support declarations.

Example:

```ts
const renderInspector = () => render(<TicketInspector />);

beforeEach(() => {
  resetTicketState();
});

test("filters activities", () => {
  renderInspector();
});
```

The included test may require:

* `renderInspector`;
* the relevant import of `TicketInspector`;
* `beforeEach`;
* `resetTicketState`;
* imports used by those declarations.

The analyzer must follow supported static identifier references.

Avoid including unrelated declarations that merely coexist at module scope.

---

# Shared Setup Rules

Shared setup is one of the main safety risks.

## Include shared setup when required

Include a lifecycle hook when:

* it applies to an included test through lexical scope;
* and its body is required to preserve the test’s behavior;
* and it can be included without also requiring unrelated inseparable logic.

## Exclude unrelated scoped setup

A lifecycle hook inside an unrelated `describe` block must not be included for a test outside that block.

## Ambiguous shared setup

If a top-level lifecycle hook contains both:

* setup required by included tests;
* unrelated setup introduced for excluded tests;

and the changes cannot be separated safely, return:

```text
partial
```

or:

```text
refused
```

Do not silently include unrelated setup and call the slice resolved.

---

# Enclosing Describe Blocks

A nested test may require its enclosing `describe` blocks for structure and scoped hooks.

The slice representation must distinguish:

* enclosing structural container;
* included changed test declaration;
* included shared hooks;
* excluded sibling tests.

Example:

```text
describe TicketInspector
├── beforeEach — included
├── test filters activities — included
└── test sorts ticket list — excluded
```

The analyzer may include the `describe` wrapper without treating every child as included.

---

# Import Reconciliation for Slice Representation

The analysis artifact must identify the imports required by included test units and support declarations.

It must also identify changed imports that are only required by excluded tests.

Example:

```ts
import { TicketInspector } from "../TicketInspector";
import { sortTickets } from "../sortTickets";
```

If the inspector test is included and sorting test excluded:

```text
TicketInspector import — required
sortTickets import — excluded
```

Do not yet rewrite the physical file.

The artifact must provide enough evidence for Prompt 005 to reconstruct a valid test module later.

Account for:

* default imports;
* named imports;
* namespace imports;
* type-only imports;
* aliased imports;
* shared import declarations containing both included and excluded specifiers.

When one import declaration contains mixed specifiers, represent the required specifiers individually.

---

# Changed-Hunk Association

Associate Git hunks with the smallest supported test declaration or support declaration.

Handle:

* newly added test;
* modified test body;
* modified test title;
* added or changed helper;
* changed fixture constant;
* changed lifecycle hook;
* added import specifier;
* modified `describe` block;
* module-level change.

If a hunk spans multiple test units and cannot be separated safely, classify the affected region as ambiguous.

Do not claim declaration-level precision when the hunk association is uncertain.

---

# Whole-File Fallback Rules

Whole-file inclusion remains valid only when explicitly justified.

Permitted reasons may include:

* unsupported test syntax;
* module-level side effects;
* inseparable shared setup;
* interdependent dynamic mocks;
* snapshot layout that cannot be separated safely;
* ambiguous hunk spanning multiple units;
* computed references;
* unsupported test factory;
* unresolved identifier dependencies;
* source transformation that cannot preserve syntax structurally.

However:

> Whole-file fallback cannot produce a resolved slice when it knowingly includes an intentionally unrelated changed test.

In that case, the result must be `partial` or `refused`.

---

# Fixture Acceptance Case

The controlled inspector test file is the required positive case.

Starting from the real `ActivityFilters` visual selection and resulting `TicketInspector` feature boundary:

The analyzer must:

1. Include relevant inspector/filter test declarations.
2. Include their required imports.
3. Include required helpers, fixtures, and lifecycle hooks.
4. Preserve necessary `describe` hierarchy.
5. Exclude the unrelated sorting test declaration.
6. Exclude imports and helpers used only by the sorting test.
7. Report evidence for every included and excluded unit.
8. Produce deterministic normalized output.
9. Upgrade the inspector feature slice from conservative whole-file test inclusion to safe test-unit slicing.

Production code must not contain the fixture’s expected names or paths.

Fixture-specific assertions belong only in tests.

---

# Sidebar Regression Case

The existing sidebar feature slice must remain correct.

Starting from `AppSidebar`:

* required sidebar tests remain included;
* unrelated heading changes remain excluded;
* no inspector-specific test units appear;
* existing integration evidence remains unchanged;
* determinism remains intact.

---

# Negative Cases

Add controlled temporary-repository tests for at least the following.

## Mixed top-level setup

A top-level `beforeEach` contains inseparable setup for both included and excluded tests.

Expected:

```text
partial
```

or:

```text
refused
```

with explicit reason.

## Dynamic test factory

Example:

```ts
createFeatureTests(componentRegistry[name]);
```

Expected:

```text
partial
```

or:

```text
refused
```

unless deterministically supported.

## Shared helper with unresolved dependency

An included test calls a helper whose required symbol cannot be resolved.

Expected unresolved dependency and non-resolved status.

## Computed import or dynamic import

Expected explicit partial/refusal.

## Mixed import declaration

A single import contains one specifier required by an included test and one required only by an excluded test.

Expected independent specifier classification.

---

# Determinism

Repeated analysis against identical:

* repository state;
* merge base;
* branch commit;
* source selection;
* analyzer version;

must produce equivalent normalized output.

Use stable ordering for:

* test files;
* describe paths;
* test units;
* imports;
* support declarations;
* evidence edges;
* exclusions;
* unresolved dependencies.

Do not include timestamps in normalized comparison output.

---

# Studio Interface

Extend the existing feature-slice panel only as necessary.

For an included mixed test file, show something similar to:

```text
src/test/inspector.test.tsx
Mode: Test-unit slice

Included
✓ filters activity by severity
✓ renders inspector details
✓ shared inspector setup

Excluded
– sorts tickets by priority
  Reason: changed test has no supported dependency edge to the selected feature

Required imports
✓ TicketInspector
✓ ActivityFilters

Excluded import specifiers
– sortTickets
```

Use actual analyzed fixture results.

Do not add a general-purpose test editor.

Clearly show:

* whole-file;
* test-unit slice;
* partial;
* refused.

When analysis remains partial, explain why.

---

# Machine-Readable Artifact

Extend the existing feature-slice JSON artifact.

The normalized artifact must express:

* test-file slicing mode;
* included test units;
* excluded test units;
* required enclosing declarations;
* required lifecycle hooks;
* required local helpers;
* required import specifiers;
* excluded changed test units;
* unresolved edges;
* confidence;
* evidence.

Do not create source patches in this task.

---

# Repository and Safety Constraints

* Do not modify fixture history.
* Do not create `combined-result`.
* Do not apply patches.
* Do not rewrite test files on disk.
* Do not execute imported test code for analysis.
* Do not depend on test runtime coverage.
* Do not use test titles as primary semantics.
* Do not use branch names as feature semantics.
* Do not parse commit messages.
* Do not add fixture-specific production maps.
* Do not weaken TypeScript.
* Do not add broad `any`.
* Do not disable tests.
* Do not swallow unresolved dependencies.
* Do not change existing resolved slices into falsely precise results.

---

# Required Unit Tests

Add tests for:

* `describe` hierarchy indexing;
* `test` and `it` declaration indexing;
* nested tests;
* lifecycle-hook scope;
* helper reference resolution;
* fixture constant resolution;
* direct production-symbol relationship;
* transitive helper relationship;
* required import-specifier calculation;
* mixed import-specifier classification;
* changed-hunk-to-test mapping;
* changed-hunk-to-helper mapping;
* included sibling versus excluded sibling;
* required enclosing `describe`;
* unrelated scoped hook exclusion;
* required top-level hook inclusion;
* inseparable mixed setup partial/refusal;
* dynamic test factory refusal;
* unresolved helper dependency;
* stable ordering;
* deterministic normalized result;
* path and stale-commit validation inherited from Prompt 004.

---

# Required Fixture Tests

## Inspector

Using the real `ActivityFilters` source selection:

Assert that:

* the final boundary remains `TicketInspector`;
* relevant inspector/filter tests are included;
* unrelated sorting test changes are excluded;
* imports used only by sorting coverage are excluded;
* required shared setup remains included;
* the test file uses `test-units` mode rather than `whole-file`;
* the overall inspector feature slice becomes `resolved`;
* repeated normalized outputs are identical.

## Sidebar

Using the real `AppSidebar` source selection:

Assert that:

* previous included dependencies remain included;
* sidebar test evidence remains correct;
* unrelated heading change remains excluded;
* no inspector or sorting units are included;
* output remains deterministic.

---

# Required Studio Tests

Test:

* mixed test file displays test-unit mode;
* included tests section;
* excluded tests section;
* required import specifiers;
* excluded import specifiers;
* partial shared-setup warning;
* refusal message;
* independent sidebar and inspector analyses;
* stale analysis invalidation after preview restart;
* no manual filename input.

---

# Required Playwright Tests

At minimum:

## Inspector test-unit slice

1. Launch `branch-sidebar` and `branch-inspector`.
2. Navigate to render the inspector.
3. Select `ActivityFilters`.
4. Analyze the feature.
5. Confirm expansion to `TicketInspector`.
6. Confirm the inspector test file reports test-unit slicing.
7. Confirm relevant inspector/filter coverage is included.
8. Confirm unrelated sorting coverage is excluded.
9. Confirm sorting-only imports or helpers are excluded.
10. Confirm status is resolved.

## Sidebar regression

1. Select `AppSidebar`.
2. Analyze the feature.
3. Confirm previous resolved behavior remains.
4. Confirm unrelated heading change remains excluded.

## Determinism

Run the inspector analysis twice against the same commit and selection.

Confirm equivalent normalized output.

## Restart invalidation

Restart the inspector preview after analysis.

Confirm the previous selection and analysis become stale or are cleared.

## Ambiguous shared setup

Exercise a controlled temporary or test-only unsupported case.

Confirm partial/refused status with explicit evidence.

---

# Full Regression Matrix

Run all existing commands, including:

```text
npm run typecheck
npm test
npm run test:instrumentation
npm run test:preview-runtime
npm run test:multi-preview
npm run test:source-analysis
npm run test:feature-slice
npm run test:e2e
npm run build
npm run fixture:verify
```

Add a focused command if appropriate:

```text
npm run test:test-slicing
```

All Prompt 001–004 tests must remain passing.

Do not weaken assertions.

Do not convert strict expected exclusions into snapshots that merely accept current output.

---

# Manual Verification

Inspect the actual fixture test diff and confirm:

1. Which inspector/filter tests are relevant.
2. Which sorting tests are unrelated.
3. Which imports are shared.
4. Which imports are sorting-only.
5. Which helpers and lifecycle hooks are required.
6. Whether the `describe` hierarchy can be preserved.
7. Whether the normalized slice excludes every unrelated sorting test change.
8. Whether the resulting artifact would contain enough evidence for later source reconstruction.
9. Whether repeated analysis is identical.
10. Whether unsupported shared-setup cases refuse honestly.

Compare against:

* Git diff;
* AST ranges;
* import references;
* helper references;
* fixture test source;
* production dependency graph.

Screenshots alone are insufficient.

---

# Anti-Cheating Audit

Search production implementation for:

* `branch-inspector`;
* `branch-sidebar`;
* `ActivityFilters`;
* `TicketInspector`;
* `sortTickets`;
* expected test titles;
* expected fixture test paths;
* fixture-specific test include/exclude arrays;
* branch-name behavior;
* commit-message behavior;
* precomputed test slices;
* test-title keyword matching;
* hidden feature maps;
* disabled tests;
* broad `any`;
* TypeScript suppression directives;
* regex-based TypeScript/test parsing as the primary implementation;
* runtime coverage files used as dependency evidence;
* Jest/Vitest private internals.

Fixture-specific values may appear in tests and documentation only.

---

# PASS Criteria

Recommend `PASS` only if all are true:

* the real inspector mixed test file is analyzed below file level;
* relevant inspector/filter tests are included;
* unrelated sorting tests are excluded;
* sorting-only imports and helpers are excluded;
* necessary shared imports, helpers, fixtures, and hooks are included;
* enclosing `describe` structure is represented correctly;
* mixed import declarations are classified by specifier;
* every included and excluded test unit has evidence;
* ambiguous shared setup produces partial/refusal;
* dynamic or unresolved test patterns do not receive false resolved status;
* deterministic repeated output is proven;
* sidebar slicing remains correct;
* all Prompt 001–004 tests remain passing;
* no fixture-specific production logic exists;
* fixture history remains unchanged;
* no candidate branch is created;
* Prompt 004’s only recorded blocker is eliminated.

If all criteria pass, update Prompt 004’s decision from:

```text
MODIFY
```

to:

```text
PASS
```

Document that the PASS applies only to the supported controlled-fixture syntax and does not prove arbitrary test-file slicing.

---

# MODIFY Criteria

Recommend `MODIFY` if:

* test-unit indexing works but shared setup remains incorrectly broad;
* unrelated sorting imports remain included without need;
* output is deterministic but not reconstructable;
* one supported test form remains incorrectly treated as whole-file;
* UI explanations are incomplete;
* relevant tests are excluded;
* unrelated tests remain included.

---

# ABANDON Criteria

Recommend `ABANDON` or replace this approach if:

* mixed test files cannot be separated without test-title heuristics;
* the implementation effectively hard-codes fixture test expectations;
* all changed tests remain whole-file inclusions;
* runtime coverage is required for every analysis;
* test units cannot be connected to production symbols deterministically;
* results are nondeterministic;
* exclusions depend on filenames or branch names;
* the analyzer silently removes required setup;
* resolved slices produce syntactically or structurally incomplete test representations.

---

# Documentation

Update:

* `/README.md`
* `/docs/decision-log.md`
* `/docs/risk-register.md`
* `/docs/limitations.md`
* `/docs/evaluation.md`

Update ADR 0004 or create a focused ADR if the test-unit architecture introduces a significant new decision.

Suggested ADR if needed:

```text
/docs/adr/0005-ast-based-test-unit-slicing.md
```

Store this complete prompt at:

```text
/docs/codex-prompts/004b-prove-safe-mixed-file-test-slicing.md
```

Document:

* supported test syntax;
* test-unit definition;
* shared setup rules;
* helper and fixture dependency rules;
* import-specifier classification;
* whole-file fallback;
* partial/refusal conditions;
* fixture result;
* why analysis still does not apply source changes.

---

# Required Completion Report

Return a structured report containing:

1. Initial repository inspection.
2. Branch and worktree used.
3. Prompt 004 architecture reused.
4. New test-unit indexing architecture.
5. Files changed.
6. Supported test syntax.
7. Describe/test/hook indexing.
8. Helper and fixture dependency resolution.
9. Import-specifier analysis.
10. Changed-hunk association.
11. Shared setup behavior.
12. Enclosing structure handling.
13. Whole-file fallback rules.
14. Partial and refusal behavior.
15. Schema changes.
16. Determinism strategy.
17. Studio interface changes.
18. Inspector mixed-file result.
19. Relevant test units included.
20. Unrelated sorting test units excluded.
21. Sorting-only imports/helpers excluded.
22. Sidebar regression result.
23. Unsupported-case results.
24. Anti-cheating audit.
25. Commands run.
26. Failures discovered and fixes.
27. Automated test results.
28. Manual Git/AST/source verification.
29. What has actually been proven.
30. What remains unproven.
31. Risks and limitations.
32. Commits created.
33. Prompt 004 final status.
34. Final recommendation: `PASS`, `MODIFY`, or `ABANDON`.

Do not proceed to Prompt 005 in this task.

Do not create or apply a candidate patch.

Do not describe a reconstructable analysis artifact as an already functioning merged branch.
