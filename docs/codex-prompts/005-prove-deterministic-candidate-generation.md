# Codex Prompt 005 — Prove Deterministic Candidate-Branch Generation

## Objective

Extend UI Merge Studio so two previously resolved visual feature slices can be applied onto the controlled fixture’s `main` branch to create a deterministic candidate branch containing only the selected features and their required supporting changes.

This task must prove:

> UI Merge Studio can convert two evidence-backed feature-slice artifacts into one functioning candidate branch without manual filename selection or manual source editing.

The required selections are:

* `AppSidebar` from `branch-sidebar`
* `ActivityFilters` from `branch-inspector`, expanded by analysis to the required `TicketInspector` boundary

The generated candidate must:

1. Start from the exact expected `main` commit.
2. Apply both resolved feature slices.
3. Include required source, styles, hooks, types, utilities, and tests.
4. Reconstruct mixed files at declaration or test-unit granularity where required.
5. Reconcile imports and exports deterministically.
6. Exclude unrelated sidebar and inspector changes.
7. Compile and build successfully.
8. Pass focused feature tests.
9. Produce the same normalized result on repeated runs.
10. Refuse one intentionally unsafe combination with an explicit explanation.

The candidate branch should be named:

```text
combined-result
```

Do not claim full Phase 0 completion unless every acceptance criterion in this prompt passes.

---

# Repository Context

Repository: UI Merge Studio

Current completed milestone branch:

```text
codex/phase0-test-case-slicing
```

Prompt 004B commits:

```text
c3f471c — feat: slice mixed test files by AST unit
c377a28 — docs: record bounded test-slicing pass
```

Current proven capabilities:

## Prompt 001 — Fixture and branch foundation

Proven:

* deterministic React + TypeScript + Vite fixture;
* `main`;
* `branch-sidebar`;
* `branch-inspector`;
* `branch-incompatible-route`;
* supporting feature files;
* intentionally unrelated same-branch changes;
* reproducible history.

## Prompt 002 — Rendered source mapping

Proven:

* rendered element-to-source identity;
* source file and declaration positions;
* stable component definition identity;
* runtime instance identity;
* nested React boundary selection;
* explicit refusal for unsupported mappings.

## Prompt 003 — Multi-preview comparison

Proven:

* isolated preview worktrees and processes;
* synchronized route, entity context, and viewport;
* independent preview/session identity;
* stale-message rejection;
* simultaneous cross-branch selections;
* incompatible comparison-contract refusal.

## Prompt 004 — Dependency-aware feature slicing

Proven:

* merge-base and branch-commit validation;
* Git diff and changed-region analysis;
* reusable AST module and symbol index;
* forward dependency traversal;
* reverse integration-edge discovery;
* feature-boundary expansion;
* style, asset, hook, type, utility, and test evidence;
* deterministic feature-slice artifacts;
* unrelated production-change exclusion.

## Prompt 004B — Mixed test-file slicing

Proven:

* test-unit indexing;
* describe/test/hook/helper/fixture relationships;
* mixed import-specifier classification;
* relevant inspector tests included;
* unrelated sorting test excluded;
* unsafe shared setup reported as partial/refused;
* deterministic schema-v2 artifacts.

Inspect all current implementation and documentation before changing anything.

Work on a new isolated branch from the completed Prompt 004B state.

Suggested branch:

```text
codex/phase0-candidate-generation
```

Do not modify existing fixture branch history.

---

# Primary Acceptance Scenario

The user runs:

* `branch-sidebar`
* `branch-inspector`

The user selects:

```text
branch-sidebar
AppSidebar
```

and:

```text
branch-inspector
ActivityFilters
```

The existing analyzer produces two resolved feature slices.

UI Merge Studio then creates:

```text
combined-result
```

from the expected fixture `main` commit and applies both slices.

The candidate must visibly and behaviorally contain:

* the selected sidebar feature;
* the selected inspector/filter feature.

It must exclude:

* the unrelated sidebar heading change;
* the unrelated inspector sorting implementation;
* the unrelated inspector sorting test;
* all other changes not justified by the two selected slices.

No manual filenames may be entered.

No manual source editing may be required.

---

# Core Principle

A feature-slice artifact is evidence for generating a patch. It is not itself an executable patch.

Prompt 005 must introduce an explicit transformation stage:

```text
Resolved feature slices
        ↓
Validated integration plan
        ↓
File reconstruction operations
        ↓
Import/export reconciliation
        ↓
Candidate worktree
        ↓
Verification
        ↓
Candidate branch commit
```

Do not directly copy every included branch file.

Do not cherry-pick feature-branch commits.

Do not apply whole branch diffs.

Do not delegate patch authorship to an LLM.

---

# Required Scope

Implement:

* candidate-generation request model;
* immutable slice-input validation;
* repository and commit validation;
* generation preflight;
* candidate branch/worktree lifecycle;
* deterministic transformation planning;
* file-level operation modeling;
* added-file handling;
* changed-declaration reconstruction;
* changed JSX integration reconstruction;
* test-unit reconstruction;
* import reconciliation;
* export and re-export reconciliation;
* style and asset inclusion;
* formatting of generated files;
* conflict detection;
* unsupported-operation refusal;
* atomic generation;
* rollback and cleanup;
* candidate diff explanation;
* candidate commit creation;
* TypeScript verification;
* production build verification;
* focused feature-test verification;
* deterministic repeat generation;
* Studio generation UI;
* machine-readable generation report;
* one intentionally incompatible source-integration refusal;
* documentation and anti-cheating audit.

---

# Explicit Non-Goals

Do not implement:

* arbitrary semantic merging;
* arbitrary branch combinations;
* cloud execution;
* multi-user collaboration;
* generic Git client behavior;
* manual patch editing UI;
* universal monorepo support;
* non-React framework support;
* backend-service integration;
* LLM-generated patches;
* automatic conflict resolution without deterministic evidence;
* silent overwriting of unresolved code;
* deployment;
* broad end-to-end accessibility and visual verification beyond what is explicitly required here;
* claiming production readiness.

---

# Candidate Generation Inputs

Generation must accept immutable validated inputs equivalent to:

```ts
type CandidateGenerationRequest = {
  repositoryRoot: string;
  baseRef: string;
  expectedBaseCommit: string;
  candidateBranch: string;
  slices: FeatureSlice[];
  analyzerSchemaVersion: number;
};
```

Each feature slice must be:

* `resolved`;
* produced by a supported schema version;
* associated with the same repository;
* associated with the expected base;
* associated with a still-current feature-branch commit;
* associated with a valid source selection;
* deterministic and internally consistent.

Reject:

* partial slices;
* refused slices;
* stale slices;
* mixed repositories;
* different base commits;
* unsupported schema versions;
* changed source branches;
* missing evidence;
* duplicate or conflicting slice identities;
* branch names outside the allowed candidate naming rules.

Do not silently rerun analysis with different inputs during generation.

The exact analyzed slices must be the generation inputs.

---

# Candidate Branch Lifecycle

Implement a safe candidate lifecycle.

Required behavior:

1. Confirm the outer repository and fixture repository state.
2. Resolve the fixture `main` commit.
3. Confirm it equals the slices’ expected base commit.
4. Confirm `combined-result` does not contain unreviewed prior output.
5. Create an isolated candidate worktree from the exact base commit.
6. Apply transformations only inside that worktree.
7. Run verification inside the candidate worktree.
8. Commit the candidate only after required checks pass.
9. Register or update `combined-result` only through an explicit safe path.
10. Clean temporary worktrees and processes after success or failure.

Do not mutate:

* `main`;
* `branch-sidebar`;
* `branch-inspector`;
* `branch-incompatible-route`.

Do not use destructive reset on user branches.

---

# Existing Candidate Branch Behavior

Repeated generation must be deterministic and safe.

If `combined-result` does not exist:

* create it only after successful generation.

If it exists and points to an equivalent previously generated result:

* report idempotent success;
* do not create unnecessary divergent commits.

If it exists but differs:

* refuse by default;
* explain the branch and commit mismatch;
* do not overwrite it silently.

Tests may use unique temporary candidate branch names where isolation is necessary, but the required manual fixture acceptance branch is:

```text
combined-result
```

---

# Transformation Plan

Before editing files, generate a deterministic transformation plan.

Conceptual schema:

```ts
type CandidatePlan = {
  version: number;
  repository: {
    baseCommit: string;
    candidateBranch: string;
  };
  sliceIds: string[];
  operations: CandidateOperation[];
  conflicts: CandidateConflict[];
  unresolved: CandidateUnresolved[];
  status: "ready" | "refused";
};
```

Supported operation kinds may include:

```ts
type CandidateOperationKind =
  | "add-file"
  | "replace-file"
  | "insert-declaration"
  | "replace-declaration"
  | "remove-declaration"
  | "insert-import-specifier"
  | "remove-import-specifier"
  | "insert-export"
  | "insert-jsx-region"
  | "replace-jsx-region"
  | "insert-test-unit"
  | "replace-test-unit"
  | "add-style-file"
  | "replace-style-file"
  | "add-asset";
```

The exact model may differ, but every source mutation must have:

* source slice ID;
* source branch commit;
* source path and region;
* base target path and region;
* evidence;
* precondition;
* deterministic operation identity;
* expected postcondition.

Do not mutate files directly without first producing the plan.

---

# Source Reconstruction Strategy

Use AST-aware reconstruction for TypeScript and TSX.

Do not reconstruct TypeScript primarily with line-based string replacement.

Git hunks may help identify changed regions, but AST identity and validated source ranges must drive transformations.

Supported cases must include the controlled fixture’s:

* added component files;
* added hook/type/utility files;
* changed React component declarations;
* changed JSX composition;
* changed imports;
* changed style registration;
* relevant test-unit insertion;
* mixed import-specifier reconstruction.

When an entire added file is fully owned by the selected slice:

* copying the exact branch blob is permitted;
* record why whole-file addition is safe.

When a modified file contains both selected and unrelated changes:

* reconstruct only the selected declarations, JSX regions, imports, or test units.

Do not copy the entire file merely because part of it is relevant.

---

# Base, Source, and Candidate Comparison

For every modified target file, analyze three versions:

```text
base version
source feature-branch version
candidate working version
```

The candidate working version may already contain edits from the other slice.

Use a deterministic three-way operation model.

Do not assume slices touch disjoint files.

For each operation:

1. Confirm the base precondition still matches.
2. Locate the target AST identity.
3. Confirm prior operations have not invalidated the target unexpectedly.
4. Apply the operation.
5. Reparse the file.
6. Validate syntax and expected declarations.
7. Record the resulting content hash.

If a target cannot be located safely, refuse.

---

# Same-File Integration

Both selected features may modify or depend on the same application composition or stylesheet.

The generator must not use “last write wins.”

Handle supported same-file edits by:

* applying operations in stable order;
* locating AST targets after each operation;
* merging compatible import changes;
* preserving both compatible JSX insertions;
* deduplicating identical additions;
* detecting overlapping source ownership;
* reparsing after each structural transformation.

Refuse when:

* two slices replace the same declaration differently;
* two JSX edits target the same inseparable region;
* one slice deletes a declaration required by another;
* import aliases conflict;
* an export name conflicts;
* style changes cannot be combined safely;
* operation preconditions are invalidated;
* resulting structure is ambiguous.

---

# Import Reconciliation

Implement deterministic import reconciliation.

Support:

* named imports;
* aliased named imports;
* default imports;
* namespace imports;
* type-only imports;
* mixed type/value imports where represented safely;
* multiple slices requiring the same import;
* existing base imports;
* imports introduced by earlier operations;
* removal of excluded-only specifiers in reconstructed mixed files.

Required behavior:

* deduplicate equivalent imports;
* preserve valid aliases;
* avoid duplicate local bindings;
* maintain type/value semantics;
* use stable ordering;
* reject conflicting local names;
* remove imports no longer referenced when reconstruction explicitly excludes their only unit;
* avoid broad automatic import cleanup unrelated to selected transformations.

Do not infer package changes from naming similarity.

---

# Export and Re-Export Reconciliation

Support the fixture’s static export patterns.

Handle:

* named exports;
* default exports;
* export declarations;
* supported barrel re-exports;
* multiple slices adding exports to the same barrel.

Deduplicate identical exports.

Refuse:

* conflicting default exports;
* conflicting exported names;
* unsupported dynamic export behavior;
* ambiguous star-export ownership;
* source branch export changes that cannot be represented safely.

---

# JSX Integration

The selected feature may require insertion into an existing base component.

For supported JSX integration:

* identify the base parent component;
* identify the source branch insertion;
* determine the structural anchor;
* verify the anchor still exists;
* insert only the selected JSX subtree;
* include required imports;
* preserve unrelated base children;
* preserve edits already added by a compatible slice;
* avoid duplicate component insertion.

Do not use visible text alone as the anchor.

Use AST structure and source evidence.

Refuse if the insertion anchor is ambiguous or changed incompatibly.

---

# Test-Unit Reconstruction

Use Prompt 004B’s test-slice artifact.

For the inspector mixed test file:

* reconstruct the required enclosing structure;
* include relevant test units;
* include required hooks, fixtures, and helpers;
* include required import specifiers;
* exclude the unrelated sorting test;
* exclude sorting-only imports or helpers where applicable;
* preserve valid syntax.

Do not copy the entire inspector test file.

After reconstruction:

* parse the test module;
* ensure included test declarations exist;
* ensure excluded sorting declarations do not exist;
* ensure all referenced local identifiers resolve within the supported model;
* ensure import bindings required by included tests exist.

For unsupported shared setup:

* refuse candidate generation rather than producing an incomplete test module.

---

# Styles and Assets

Support the fixture’s actual style mechanisms.

For added style files:

* copy exact branch blob when fully slice-owned.

For modified shared stylesheets:

* apply only slice-owned rules or supported changed regions;
* combine compatible rules from both slices;
* preserve base rules;
* exclude unrelated rule changes.

If safe CSS rule-level reconstruction is not implemented and a modified stylesheet contains unrelated changes:

* refuse or mark the plan unresolved;
* do not copy the whole file and claim success.

Assets may be copied only when:

* repository-owned;
* directly included by slice evidence;
* content hash matches the analyzed branch blob;
* target path does not conflict.

---

# File Deletion

Feature slices should not normally delete unrelated base files.

Support deletion only if:

* the slice explicitly proves the selected feature requires it;
* no other selected slice or retained base symbol depends on it;
* the target blob matches the expected base content;
* the reason is documented.

Otherwise refuse.

The controlled positive case should not require broad deletion.

---

# Formatting

After AST reconstruction:

* use the repository’s existing formatter if configured;
* otherwise use the chosen printer consistently;
* preserve valid TypeScript/TSX;
* avoid reformatting unrelated files;
* ensure stable output across runs.

Formatting must not become a mechanism that obscures unrelated semantic changes.

The generation report should distinguish:

* semantic operations;
* formatting-only differences.

---

# Atomicity and Rollback

Generation must be atomic from the user’s perspective.

If any required step fails:

* do not leave a successful-looking candidate branch;
* do not commit partial output;
* mark generation failed or refused;
* retain a machine-readable failure report;
* clean temporary worktrees;
* terminate candidate processes;
* leave source branches untouched.

A failed candidate worktree may be retained only behind an explicit debug option and must not become the default behavior.

---

# Candidate Verification

Run required checks inside the generated candidate worktree.

At minimum:

```text
npm install
npm run typecheck
npm test
npm run build
```

Use the fixture’s actual package manager and scripts.

Prefer deterministic install behavior using the existing lockfile.

Add focused tests proving:

* sidebar renders and functions;
* inspector renders;
* activity filters work;
* clipboard failure behavior remains covered if part of the included inspector test slice;
* unrelated sorting behavior/change is absent;
* unrelated heading change is absent.

Do not weaken fixture tests.

Do not mock generation success.

A candidate must not be committed as successful if required verification fails.

---

# Behavioral Acceptance

The generated app must be opened and exercised.

Required manual or Playwright behavior:

1. Launch `combined-result`.
2. Confirm the selected sidebar is visible.
3. Navigate to the inspector.
4. Confirm inspector content is visible.
5. Use `ActivityFilters`.
6. Confirm filter behavior changes the visible activity set.
7. Confirm both features coexist.
8. Confirm the unrelated heading text from `branch-sidebar` is absent.
9. Confirm the unrelated sorting behavior/change from `branch-inspector` is absent.
10. Confirm the app has no runtime errors.

Compilation alone is insufficient.

---

# Candidate Diff Audit

After generation, compare:

```text
main...combined-result
```

Produce a human-readable and machine-readable audit.

For every changed file, identify:

* which slice caused the change;
* which operation caused it;
* why it was required;
* whether it was added or reconstructed;
* which unrelated source-branch changes were excluded.

The audit must explicitly verify:

* no entire feature commit was cherry-picked;
* no unrelated sidebar heading delta exists;
* no unrelated sorting implementation exists;
* no unrelated sorting test exists;
* no unexpected files changed;
* no generated build output is committed;
* no runtime analysis artifact is committed unless explicitly intended.

---

# Determinism and Idempotence

Run candidate generation at least twice from the same:

* base commit;
* slice artifacts;
* generator version.

After normalization, require:

* identical candidate plan;
* identical transformed file contents;
* identical candidate tree hash;
* identical verification configuration;
* equivalent audit report.

Commit hashes may differ if timestamps are not controlled.

Prefer deterministic commit metadata in tests or compare tree hashes rather than requiring identical commit hashes.

A second generation must not duplicate:

* imports;
* JSX;
* exports;
* tests;
* CSS rules;
* files.

---

# Generation Report

Produce a machine-readable report.

Suggested path:

```text
.ums/generation/<generation-id>/candidate-report.json
```

Do not commit runtime reports by default.

Conceptual schema:

```ts
type CandidateGenerationReport = {
  version: number;
  generationId: string;
  status: "succeeded" | "refused" | "failed";
  repository: {
    baseCommit: string;
    candidateBranch: string;
    candidateCommit?: string;
    candidateTree?: string;
  };
  sliceIds: string[];
  plan: CandidatePlan;
  appliedOperations: AppliedOperation[];
  excludedSourceChanges: ExcludedSourceChange[];
  conflicts: CandidateConflict[];
  verification: VerificationResult[];
  cleanup: CleanupResult;
};
```

The report must distinguish:

* refused before mutation;
* failed during transformation;
* failed during verification;
* successful and committed.

---

# Studio Interface

Extend UI Merge Studio with a bounded candidate-generation workflow.

Required UI:

* selected resolved slices;
* base commit;
* candidate branch name;
* preflight status;
* generation plan summary;
* conflicts or unresolved operations;
* explicit “Generate candidate” action;
* progress through:

  * validate;
  * plan;
  * transform;
  * verify;
  * commit;
* final success/refusal/failure status;
* changed-file audit;
* verification results;
* candidate commit and worktree information;
* launch candidate action after success.

Do not add a generic source editor.

Do not allow generation when:

* either selection is missing;
* either slice is stale;
* either slice is partial/refused;
* base commits differ;
* feature branch commits changed;
* conflicts already exist.

---

# Unsafe Combination Refusal

Add one controlled source-level incompatibility case.

This must be distinct from Prompt 003’s route-contract incompatibility.

The unsafe case should involve source integration, such as:

* two slices replacing the same declaration differently;
* conflicting imports using the same local binding;
* incompatible JSX replacements at the same structural anchor;
* one feature deleting a symbol required by the other;
* conflicting export names;
* inseparable shared stylesheet changes.

The refusal must occur during preflight or transformation planning before a successful candidate commit.

The explanation must include:

* conflicting files;
* conflicting declarations or regions;
* involved slice IDs;
* evidence;
* why deterministic reconciliation is unsafe;
* possible manual resolution path.

Do not create a broken candidate to demonstrate refusal.

Use an isolated temporary test repository if modifying the generated fixture history is unnecessary.

---

# Failure Cases

Add tests for:

* stale base commit;
* stale feature branch commit;
* partial slice input;
* refused slice input;
* mixed repositories;
* unsupported schema version;
* candidate branch already exists with unexpected commit;
* target path traversal;
* target file changed from expected base;
* duplicate operation;
* overlapping declaration replacement;
* conflicting import aliases;
* conflicting exports;
* ambiguous JSX anchor;
* unresolved test helper;
* modified shared stylesheet without safe rule extraction;
* verification command failure;
* candidate process failure;
* cleanup after failure;
* no commit after failure;
* no mutation of source branches.

---

# Required Unit Tests

Add unit tests for:

* generation-request validation;
* common base validation;
* stable plan ordering;
* operation identity;
* added-file planning;
* declaration insertion;
* declaration replacement;
* import merging;
* mixed import-specifier reconstruction;
* export reconciliation;
* JSX insertion;
* JSX duplicate prevention;
* compatible same-file operations;
* overlapping-operation conflict;
* test-unit reconstruction;
* helper and hook inclusion;
* excluded test omission;
* style-file handling;
* asset handling;
* syntax reparse after operations;
* content-hash preconditions;
* path traversal rejection;
* branch-name validation;
* atomic rollback;
* deterministic tree output.

---

# Required Fixture Integration Tests

## Candidate positive case

From fixture `main`, apply:

* sidebar feature slice;
* inspector feature slice.

Assert:

* candidate branch starts from exact `main`;
* both selected features exist;
* required supporting files exist;
* expected imports and exports exist;
* required integration changes exist;
* relevant tests exist;
* unrelated heading change is absent;
* unrelated sorting implementation is absent;
* unrelated sorting test is absent;
* changed-file set matches the generation plan;
* TypeScript passes;
* tests pass;
* production build passes.

## Repeatability

Generate twice from fresh worktrees.

Assert:

* normalized plans are equal;
* candidate tree hashes are equal;
* no duplicated imports/JSX/tests/styles;
* no source branches changed.

## Refusal case

Apply controlled conflicting slices.

Assert:

* status is refused;
* no successful candidate commit exists;
* conflict explanation identifies precise source ownership;
* temporary worktree is cleaned.

---

# Required Studio Component Tests

Test:

* generation disabled without two resolved slices;
* stale slice blocks generation;
* partial slice blocks generation;
* preflight-ready state;
* plan summary;
* conflict display;
* progress stages;
* successful verification display;
* failed verification display;
* refusal display;
* candidate audit display;
* launch action only after success;
* restart invalidates dependent generation state;
* repeated generation reports idempotence.

---

# Required Playwright Tests

At minimum:

## End-to-end candidate generation

1. Start `branch-sidebar` and `branch-inspector`.
2. Select `AppSidebar`.
3. Select `ActivityFilters`.
4. Analyze both slices.
5. Confirm both are resolved.
6. Generate `combined-result`.
7. Observe validation, planning, transformation, and verification.
8. Confirm successful candidate commit.
9. Launch the generated candidate.
10. Confirm sidebar renders.
11. Navigate to inspector.
12. Confirm activity filters work.
13. Confirm unrelated heading text is absent.
14. Confirm unrelated sorting behavior/change is absent.
15. Confirm no runtime failure.

## Determinism

Run generation again against identical inputs in an isolated clean candidate context.

Confirm equivalent tree hash and plan.

## Stale input

Change or restart one source preview after analysis.

Confirm generation is blocked until re-analysis.

## Unsafe combination

Submit controlled conflicting slices.

Confirm explicit refusal and no candidate commit.

---

# Full Verification Matrix

Run all existing checks:

```text
npm run typecheck
npm test
npm run test:instrumentation
npm run test:preview-runtime
npm run test:multi-preview
npm run test:source-analysis
npm run test:feature-slice
npm run test:test-slicing
npm run test:e2e
npm run build
npm run fixture:verify
```

Add focused commands if appropriate:

```text
npm run test:candidate-generation
npm run test:candidate-integration
```

All Prompt 001–004B tests must remain passing.

Do not disable slow tests.

Do not replace strict behavioral assertions with snapshots.

---

# Manual Verification

Manually inspect:

1. Exact base commit.
2. Exact two slice IDs.
3. Candidate plan.
4. Every candidate file mutation.
5. Reconstructed mixed source files.
6. Reconstructed inspector test file.
7. Import/export reconciliation.
8. Candidate Git diff.
9. Absence of unrelated heading change.
10. Absence of sorting implementation change.
11. Absence of sorting test.
12. TypeScript result.
13. Test result.
14. Production build result.
15. Running candidate behavior.
16. Deterministic second-generation tree.
17. Unsafe-combination refusal.
18. Worktree and process cleanup.
19. Source branch immutability.
20. Candidate commit contents.

Screenshots are supplementary.

The Git diff, generated tree, commands, and observed behavior are the primary evidence.

---

# Anti-Cheating Audit

Search production implementation for:

* `branch-sidebar`;
* `branch-inspector`;
* `AppSidebar`;
* `ActivityFilters`;
* `TicketInspector`;
* `sortTickets`;
* fixture file paths;
* expected changed-file arrays;
* expected include/exclude maps;
* test-title matching;
* branch-name feature semantics;
* commit-message parsing;
* cherry-pick commands;
* precomputed patches;
* manually stored combined-result source;
* direct copying of whole feature commits;
* LLM calls for patch generation;
* hidden fallback to copying every included file;
* disabled tests;
* broad `any`;
* TypeScript suppression;
* private React internals;
* silent conflict resolution;
* wildcard path writes;
* destructive Git commands.

Fixture-specific values may appear in tests and documentation only.

---

# PASS Criteria

Recommend `PASS` only if all are true:

* two real resolved visual feature slices are used as inputs;
* no manual filename selection occurs;
* exact base and feature commits are validated;
* a deterministic transformation plan is generated;
* added files are handled safely;
* modified files are reconstructed below whole-file level where needed;
* imports and exports are reconciled;
* compatible same-file changes coexist;
* mixed inspector tests are reconstructed without the sorting test;
* unrelated sidebar heading change is absent;
* unrelated inspector sorting implementation is absent;
* unrelated inspector sorting test is absent;
* candidate starts from exact `main`;
* source branches remain unchanged;
* candidate TypeScript passes;
* candidate focused tests pass;
* candidate production build passes;
* both selected features work together at runtime;
* repeated generation produces an equivalent tree;
* unsafe source integration is explicitly refused;
* failed generation leaves no successful-looking branch;
* candidate diff is fully explained;
* no fixture-specific production logic exists;
* no LLM authored the patch;
* all prior tests remain passing;
* `combined-result` is created only after success.

---

# MODIFY Criteria

Recommend `MODIFY` if the architecture is viable but bounded issues remain, such as:

* one supported import pattern is not reconciled;
* candidate compiles but a required focused behavior test fails;
* deterministic plan exists but output formatting is unstable;
* safe same-file integration remains overly conservative;
* candidate generation succeeds but cleanup is incomplete;
* test reconstruction is syntactically correct but not sufficiently evidenced;
* one unrelated change remains in the candidate;
* refusal behavior lacks precise source explanation.

Do not recommend PASS if the candidate merely compiles.

---

# ABANDON Criteria

Recommend `ABANDON` or replace the approach if:

* generation is effectively commit cherry-picking;
* whole feature-branch files are copied despite mixed unrelated changes;
* patches are manually authored for the fixture;
* branch names determine transformations;
* an LLM writes the candidate patch;
* same-file edits use last-write-wins;
* unrelated changes cannot be excluded;
* repeated generation changes the tree;
* source branches are mutated;
* failed verification still creates a successful candidate commit;
* conflicts are silently resolved;
* the generated app compiles but selected behavior is missing;
* the system cannot explain how candidate files were produced.

---

# Required Documentation

Update:

* `/README.md`
* `/docs/product-brief.md`
* `/docs/decision-log.md`
* `/docs/risk-register.md`
* `/docs/limitations.md`
* `/docs/evaluation.md`
* `/docs/demo-script.md`

Create an ADR for candidate-generation architecture.

Suggested ADR:

```text
/docs/adr/0006-deterministic-ast-candidate-generation.md
```

Store this complete prompt at:

```text
/docs/codex-prompts/005-prove-deterministic-candidate-generation.md
```

Document:

* immutable generation inputs;
* plan-before-mutation architecture;
* transformation operation model;
* three-way base/source/candidate reasoning;
* import/export reconciliation;
* test-unit reconstruction;
* conflict detection;
* atomic rollback;
* verification gating;
* idempotence;
* candidate audit;
* why a verified controlled candidate does not prove arbitrary semantic merge.

---

# Required Completion Report

Return a structured report containing:

1. Initial repository inspection.
2. Branch and worktree used.
3. Existing Prompt 004B architecture reused.
4. Candidate-generation architecture.
5. Files changed.
6. Generation request schema.
7. Slice-input validation.
8. Candidate branch/worktree lifecycle.
9. Transformation-plan schema.
10. Supported operation types.
11. Added-file behavior.
12. Declaration reconstruction.
13. JSX integration.
14. Import reconciliation.
15. Export reconciliation.
16. Test-unit reconstruction.
17. Style and asset handling.
18. Same-file operation behavior.
19. Conflict detection.
20. Atomicity and rollback.
21. Machine-readable report.
22. Studio interface.
23. Positive candidate generation result.
24. Candidate changed-file audit.
25. Sidebar feature runtime result.
26. Inspector/filter runtime result.
27. Unrelated heading exclusion.
28. Sorting implementation exclusion.
29. Sorting test exclusion.
30. Candidate TypeScript result.
31. Candidate test result.
32. Candidate production build result.
33. Deterministic repeat result.
34. Unsafe-combination refusal result.
35. Anti-cheating audit.
36. Commands run.
37. Failures discovered and fixes.
38. Automated test results.
39. Manual Git/source/runtime verification.
40. What has actually been proven.
41. What remains unproven.
42. Risks and limitations.
43. Commits created.
44. Final recommendation: `PASS`, `MODIFY`, or `ABANDON`.

Do not proceed to broad Phase 0 polish or expansion in this task.

Do not claim arbitrary React branch merging.

Do not call an unverified candidate successful.
