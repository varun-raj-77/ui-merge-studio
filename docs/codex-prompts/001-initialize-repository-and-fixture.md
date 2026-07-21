# UI Merge Studio — Phase 0 Amendments and First Codex Prompt

## 1. Exact Amendments to the Approved Decisions

### Amendment A — Candidate branch commit structure

Replace any decision permitting the useful feature and unrelated change to be separated into distinguishable commits with the following:

> Each positive candidate branch must contain its useful feature and its required unrelated branch change within the same commit.

Required structure:

```text
main
├── branch-sidebar
│   └── one branch commit containing:
│       - the complete collapsible-sidebar feature;
│       - all supporting components, hooks, styles, types, and tests;
│       - the unrelated page-heading change.
│
└── branch-inspector
    └── one branch commit containing:
        - the complete inspector feature;
        - all supporting components, hooks, utilities, styles, types,
          fixture changes, and tests;
        - the unrelated ticket-sorting change.
```

Each positive branch should preferably be exactly one commit ahead of the shared `main` base.

If repository tooling creates unavoidable administrative commits, those commits must not separate, label, or reveal useful-feature ownership. The complete implementation delta and unrelated change must remain inseparable through commit selection.

The future engine must not be able to pass by:

* cherry-picking a feature commit;
* excluding a separately labeled unrelated-change commit;
* interpreting commit order;
* selecting commits based on messages;
* associating one commit with one visible feature.

### Amendment B — Commit messages

Commit messages must be intentionally neutral and must not identify which files or hunks belong to the visually selected feature.

Acceptable examples:

```text
Implement sidebar branch variation
Implement inspector branch variation
```

Unacceptable examples:

```text
Add collapsible sidebar
Add unrelated heading experiment
Add activity filters
Change ticket sorting separately
Sidebar feature files
Inspector dependency changes
```

Commit messages may identify the branch variation at a broad level, but they must not encode a production-readable dependency slice.

Production code must never inspect commit messages.

### Amendment C — Branch names

The approved branch names remain:

```text
branch-sidebar
branch-inspector
```

These names identify which preview variation is being demonstrated. They must not be interpreted by production code as:

* a feature identifier;
* a component name;
* a dependency key;
* a file-selection rule;
* a merge strategy.

The future engine must behave from source metadata, branch deltas, and dependency analysis—not semantic parsing of branch names.

### Amendment D — Tests

Tests must define behavior, not feature ownership.

Tests may be colocated using ordinary project conventions, but:

* test names must not contain machine-readable lists of production dependencies;
* test metadata must not declare which source files constitute the selected feature;
* tests must not export feature manifests;
* production dependency analysis must not use a manually maintained map from test names to files;
* fixture verification may check that expected tests exist, but those checks must remain isolated fixture infrastructure and must not be imported by production packages.

A future test-discovery strategy may use generic conventions and import relationships. It may not use sidebar-specific or inspector-specific lookup tables.

### Amendment E — Fixture-generation scripts

The fixture-generation script may generate known files because it creates the controlled test fixture. However:

* it must not emit a runtime manifest identifying selected-feature files;
* it must not write comments, JSON, tags, labels, or metadata such as:

  * `sidebarFeatureFiles`;
  * `inspectorDependencies`;
  * `selectedSlice`;
  * `includeForMerge`;
  * `excludeFromMerge`;
* it must not place machine-readable ownership markers inside production source;
* it must not produce a patch file representing the desired future selection;
* it must not produce a prepared `combined-result`;
* fixture-only expected-output information must remain in test or evaluation infrastructure and outside future production modules.

The fixture generator must create the complete positive branch delta as one commit per branch.

### Amendment F — Documentation boundaries

Documentation may describe the expected included and excluded behavior for human evaluation.

Production code must not parse or depend on:

* Markdown documents;
* acceptance-criteria text;
* Codex prompts;
* branch descriptions;
* expected-file lists in fixture verification;
* commit messages.

Any fixture-specific assertions must be clearly separated from production architecture, preferably under paths such as:

```text
tests/fixture-contract/
scripts/verify-phase0-fixture.ts
```

No production package may import these files.

### Amendment G — Updated fixture design

#### `branch-sidebar`

Create one commit from the shared `main` base containing all of the following together:

Useful selected feature:

* collapsible sidebar;
* expand/collapse control;
* icon-only collapsed mode;
* accessible names;
* keyboard support;
* local-storage persistence;
* malformed-storage handling;
* layout changes;
* open-ticket count badge;
* supporting components;
* supporting hook;
* supporting types;
* supporting styles;
* supporting tests.

Required unrelated change:

```text
Support Tickets
→
Operations Command Center
```

The heading change must be part of the same commit as the sidebar feature.

#### `branch-inspector`

Create one commit from the shared `main` base containing all of the following together:

Useful selected feature:

* activity filter controls;
* filtered activity list;
* empty state;
* copy-reference interaction;
* copied feedback;
* clipboard-failure handling;
* severity summary;
* supporting components;
* supporting hooks;
* supporting utilities;
* type and fixture changes;
* supporting styles;
* supporting tests.

Required unrelated change:

* ticket-list sorting changes from base fixture order to reverse chronological order;
* the sorting utility and its use in `TicketList.tsx`.

The sorting change must be part of the same commit as the inspector feature.

### Amendment H — Updated anti-cheating constraints

Phase 0 is invalid if the future engine uses any of the following to isolate a selected feature:

* commit boundaries;
* commit messages;
* branch-name parsing;
* commit order;
* manually created feature commits;
* fixture-generation implementation details;
* documentation file lists;
* test names as ownership declarations;
* fixture verification expectations;
* precomputed patches;
* manually maintained feature manifests;
* component-name-to-file maps;
* branch-specific allowlists;
* a prepared target implementation.

The system must derive the candidate slice from:

```text
rendered component selection
→ source identity
→ branch delta relative to common ancestor
→ static dependencies and changed symbols/hunks
→ bounded reconciliation
→ verification
```

### Amendment I — Updated acceptance criteria

Add the following mandatory PASS criteria:

* `branch-sidebar` is exactly one meaningful implementation commit ahead of the shared base, and that commit contains both the complete sidebar feature and the unrelated heading change.
* `branch-inspector` is exactly one meaningful implementation commit ahead of the shared base, and that commit contains both the complete inspector feature and the unrelated sorting change.
* Cherry-picking the sole commit from either positive branch necessarily imports both the useful and unrelated changes.
* No separate commit, tag, patch, manifest, generated artifact, or metadata isolates the useful feature.
* Commit messages do not describe feature dependency ownership.
* Production packages do not parse branch names or commit messages.
* Production packages do not import fixture-verification code.
* Tests do not expose a manually maintained production-readable feature-to-file mapping.
* Fixture scripts do not generate a desired merge patch or `combined-result`.
* The eventual candidate must exclude unrelated changes despite those changes sharing the same commit as the useful feature.

Add the following mandatory failure condition:

> If Phase 0 can pass by cherry-picking, reverting, filtering, or otherwise exploiting commit-level organization rather than deriving a source slice from the visual selection and branch delta, Phase 0 fails.

---

# 2. Corrected Complete First Codex Prompt

## Prompt title

**Initialize UI Merge Studio and Create the Phase 0 Git Fixture**

You are the implementation engineer for UI Merge Studio.

Your task is limited to repository initialization, documentation foundations, and creation of the controlled Phase 0 fixture repository and Git branches.

Do not implement UI Merge Studio’s preview interface, source instrumentation, source mapping, dependency extraction, branch combination, or merge engine in this task.

---

## Objective

Initialize the UI Merge Studio repository and create a reproducible controlled React, TypeScript, and Vite fixture that will later be used to test this claim:

> A developer can select two preferred features directly from two running React branches, and the system can create one functioning combined branch without the developer manually identifying source files.

This task establishes trustworthy test inputs. It does not attempt to prove the claim.

The fixture must contain:

* `main`;
* `branch-sidebar`;
* `branch-inspector`;
* one dedicated incompatible variation branch.

Do not create a manually prepared successful `combined-result` branch.

Critical commit-history constraint:

> The useful feature and required unrelated change on each positive candidate branch must exist in the same branch commit.

The future engine must not be capable of passing Phase 0 by cherry-picking a known feature commit or interpreting commit metadata.

---

## Repository context

UI Merge Studio is an open-source local developer tool for comparing multiple React implementations, selecting preferred rendered features, tracing those selections to source and dependencies, generating a combined Git branch, and verifying the result.

Initial supported scope:

* local Git repositories;
* React;
* TypeScript;
* Vite;
* npm, pnpm, or yarn;
* local branches and worktrees;
* one trusted local developer.

Source-of-truth sentence:

> Visually select preferred features from multiple running React branches and create one verified combined branch.

Phase 0 is a falsification prototype. Do not broaden the product.

The controlled fixture is a small “Support Operations Dashboard” with:

* a `/tickets` route;
* stable ticket fixtures;
* a sidebar;
* a ticket list;
* a ticket inspector;
* query-parameter-based selected-ticket state.

---

## Required working method

Before editing:

1. Inspect the current repository.
2. Report:

   * existing files;
   * package manager;
   * Git status;
   * relevant configuration.
3. Do not overwrite existing work.
4. If the repository is empty, initialize it deliberately.
5. Use small, reviewable outer-repository commits.
6. Preserve a clean outer repository state at completion.
7. Do not modify global Git configuration.
8. Do not push or create remote resources.
9. Do not rewrite unrelated history.
10. Do not use destructive Git commands against unknown or user-owned paths.

Do not use:

```text
git reset --hard
git clean -fd
forced branch deletion
forced worktree removal
```

unless the target is positively identified as generated temporary data, the action is safe, and it is documented in the completion report.

Inspect first. Then implement.

---

## Exact deliverables

### 1. Repository foundation

Create the minimum maintainable repository structure needed for this Phase 0 task.

At minimum:

```text
docs/
  adr/
  codex-prompts/
fixtures/
  support-dashboard-template/
scripts/
tests/
README.md
package.json
.gitignore
```

A workspace package manager may be selected, but prefer the simplest approach that supports deterministic fixture generation and testing.

Do not create unused package scaffolding for future architecture.

The root repository must include commands for:

* creating or safely recreating the generated fixture repository;
* verifying fixture Git structure;
* verifying all required branches;
* running fixture tests;
* building every fixture branch.

Preferred script names:

```json
{
  "fixture:create": "...",
  "fixture:verify": "...",
  "fixture:test": "...",
  "fixture:build-all": "..."
}
```

Equivalent names require a documented reason.

---

### 2. Documentation foundation

Create substantive initial versions of:

```text
/docs/product-brief.md
/docs/decision-log.md
/docs/risk-register.md
/docs/evaluation.md
/docs/limitations.md
/docs/adr/0001-phase-0-controlled-fixture-and-component-boundary.md
/docs/codex-prompts/001-initialize-repository-and-fixture.md
```

Store this prompt in:

```text
/docs/codex-prompts/001-initialize-repository-and-fixture.md
```

Formatting adjustments are allowed, but do not weaken or omit requirements.

The documentation must state:

* the exact Phase 0 claim;
* supported scope;
* non-goals;
* controlled-fixture rationale;
* component-boundary selection contract;
* major technical risks;
* PASS, MODIFY, and ABANDON logic;
* anti-cheating requirements;
* that current work does not prove source mapping, dependency slicing, branch combination, or the Phase 0 claim.

The documentation must explicitly state:

> Commit boundaries are not a valid feature-isolation signal in the Phase 0 fixture.

It must also state:

* each positive branch contains its useful feature and unrelated change in one commit;
* production code must not inspect branch names, commit messages, fixture scripts, documentation, or test metadata to identify the feature slice.

Do not add résumé statements, launch plans, novelty claims, or unsupported product claims.

---

### 3. Controlled fixture application

Create a React, TypeScript, and Vite application template for a “Support Operations Dashboard.”

The application must include:

* route `/tickets`;
* selected-ticket query parameter such as:

  * `/tickets?ticket=TCK-102`;
* stable deterministic ticket fixture data;
* left sidebar;
* ticket list;
* ticket inspector;
* basic styling;
* strict TypeScript;
* unit or component tests;
* Playwright end-to-end tests;
* commands for:

  * typecheck;
  * tests;
  * production build;
  * end-to-end tests.

The fixture must not use external services or live network APIs.

Suggested baseline structure:

```text
src/
  app/
    App.tsx
    routes.tsx
  features/
    navigation/
      AppSidebar.tsx
      SidebarNavItem.tsx
    tickets/
      TicketPage.tsx
      TicketList.tsx
      TicketListItem.tsx
      TicketInspector.tsx
      TicketHeader.tsx
      TicketActivityList.tsx
  fixtures/
    tickets.ts
  hooks/
    useSelectedTicket.ts
  state/
    ticketSelection.ts
  types/
    ticket.ts
  styles/
    app.css
    sidebar.css
    ticket-inspector.css
  test/
    renderApp.tsx
```

Adjustments are allowed when justified, but:

* the app must remain decomposed;
* selected features must span multiple meaningful files;
* do not place an entire feature in one component;
* do not use only inline styles;
* do not make the future dependency graph trivial.

---

### 4. Reproducible fixture Git repository

The generated fixture must be a real standalone Git repository with real commits and branches.

Create a tracked deterministic generation script, preferably:

```text
scripts/create-phase0-fixture.ts
```

Generate the fixture under an ignored path such as:

```text
fixtures/generated/support-dashboard/
```

The script must be safe to rerun.

It must refuse to overwrite or remove a generated fixture with uncommitted work unless an explicit safe recreation option is provided.

The creation process must:

1. create the fixture repository;
2. initialize Git;
3. configure repository-local fixture identity if required;
4. create and commit `main`;
5. record the `main` base commit;
6. create `branch-sidebar` from that exact base;
7. apply all sidebar-branch changes;
8. create exactly one meaningful implementation commit on `branch-sidebar`;
9. create `branch-inspector` from the same exact base;
10. apply all inspector-branch changes;
11. create exactly one meaningful implementation commit on `branch-inspector`;
12. create one incompatible variation branch from a documented base;
13. verify branch ancestry;
14. verify positive-branch commit counts and contents;
15. leave the generated repository on a documented branch;
16. print branch SHAs and verification instructions.

Do not include the generated fixture’s `.git` directory in the outer repository.

The tracked template and creation script must reproduce the same logical branch trees and behavior from a fresh clone.

If commit SHAs differ due to timestamps, document that limitation. Tree contents and behavior must remain deterministic.

---

### 5. Mandatory positive-branch commit topology

Both positive branches must start from the exact same `main` commit.

Required graph shape:

```text
                 branch-sidebar
                /
main base commit
                \
                 branch-inspector
```

Each positive branch must be exactly one meaningful implementation commit ahead of `main`.

The `branch-sidebar` commit must contain both:

* the complete useful sidebar feature;
* the unrelated heading change.

The `branch-inspector` commit must contain both:

* the complete useful inspector feature;
* the unrelated ticket-sorting change.

Do not create:

* a separate feature commit;
* a separate unrelated-change commit;
* a preparatory dependency commit;
* a cleanup commit that isolates ownership;
* tags identifying feature-only commits;
* patch files identifying the useful subset.

Cherry-picking the sole commit from either positive branch must necessarily bring in both the useful and unrelated changes.

The generation script and verification tests must enforce this topology.

---

### 6. Commit-message restrictions

Use neutral broad commit messages.

Preferred positive-branch messages:

```text
Implement sidebar branch variation
Implement inspector branch variation
```

The incompatible branch may use a similarly broad message, such as:

```text
Implement path-route branch variation
```

Commit messages must not identify:

* supporting file lists;
* selected dependency boundaries;
* useful versus unrelated hunks;
* production ownership metadata.

Do not create messages such as:

```text
Add sidebar feature files
Add unrelated heading
Add inspector dependencies
Add unrelated sorting
```

Future production code must not parse commit messages.

---

### 7. Branch-name restrictions

Use the required branch names:

```text
main
branch-sidebar
branch-inspector
```

Use a clear name for the incompatible branch, such as:

```text
branch-inspector-path-route
```

Branch names exist for human fixture navigation only.

Do not create any production logic that interprets branch names as:

* component names;
* feature IDs;
* file-selection rules;
* merge recipes;
* dependency ownership.

---

### 8. `main` branch behavior

The `main` branch must provide:

* functional `/tickets` route;
* stable tickets;
* plain static sidebar;
* ticket list;
* simple ticket inspector;
* query-parameter ticket selection;
* baseline styles;
* no collapsible sidebar;
* no activity filtering;
* no copy-reference interaction;
* no copied feedback;
* no severity summary.

Required baseline tests:

* `/tickets` renders;
* fixture tickets appear;
* selecting a ticket updates the query parameter;
* direct query-parameter navigation opens the expected ticket;
* sidebar navigation is keyboard accessible;
* primary Playwright flow reports no unexpected runtime errors.

---

### 9. `branch-sidebar` changes

Create `branch-sidebar` directly from the shared `main` base commit.

Create one commit containing all changes described in this section.

#### Useful selected feature

Implement:

* collapsible sidebar;
* expand/collapse control;
* icon-only collapsed mode;
* accessible names in collapsed mode;
* keyboard-operable toggle;
* persisted collapsed state using `localStorage`;
* safe fallback for malformed stored values;
* layout adjustment;
* open-ticket count badge derived from fixture data.

Required decomposition:

Modified:

```text
src/features/navigation/AppSidebar.tsx
src/features/navigation/SidebarNavItem.tsx
src/styles/sidebar.css
src/styles/app.css
```

Added or equivalently decomposed:

```text
src/features/navigation/SidebarToggle.tsx
src/features/navigation/SidebarOpenCount.tsx
src/features/navigation/useSidebarState.ts
src/features/navigation/sidebar.types.ts
```

Do not collapse these responsibilities into one component.

Required tests:

* default expanded state;
* toggle behavior;
* keyboard operation;
* accessible labels while collapsed;
* persistence after reload;
* malformed local-storage fallback;
* correct open-ticket count;
* ticket navigation still works.

#### Required unrelated change

In the same commit, change:

```text
Support Tickets
```

to:

```text
Operations Command Center
```

Place the heading change in the ticket-page area, outside the sidebar dependency chain.

The heading change must:

* be present in the sole branch implementation commit;
* be visible when the branch runs;
* not be required for sidebar behavior;
* later be expected to remain absent from `combined-result`.

Do not identify the heading hunk through machine-readable production metadata.

---

### 10. `branch-inspector` changes

Create `branch-inspector` directly from the same shared `main` base commit.

Create one commit containing all changes described in this section.

#### Useful selected feature

Implement:

* activity-type filter controls;
* filtered activity list;
* empty state when no activity matches;
* copy-ticket-reference button;
* temporary copied feedback;
* safe clipboard-failure handling;
* ticket severity summary derived from priority.

Required decomposition:

Modified:

```text
src/features/tickets/TicketInspector.tsx
src/features/tickets/TicketActivityList.tsx
src/features/tickets/TicketHeader.tsx
src/styles/ticket-inspector.css
src/types/ticket.ts
```

Added or equivalently decomposed:

```text
src/features/tickets/TicketActivityFilter.tsx
src/features/tickets/CopyTicketReferenceButton.tsx
src/features/tickets/TicketSeveritySummary.tsx
src/features/tickets/useActivityFilter.ts
src/features/tickets/useCopyFeedback.ts
src/features/tickets/getTicketSeverity.ts
src/features/tickets/filterTicketActivities.ts
src/features/tickets/inspector.types.ts
src/styles/ticket-activity-filter.css
```

Fixture data may be changed narrowly to support activity kinds.

Required tests:

* all activity appears initially;
* filters change visible activity;
* unmatched filters show the empty state;
* severity mapping is correct;
* copy-success feedback works;
* clipboard failure does not crash the application;
* changing tickets refreshes inspector content;
* direct query-parameter navigation works.

#### Required unrelated change

In the same commit:

* change ticket-list sorting from base fixture order to reverse chronological order;
* add a utility such as:

```text
src/features/tickets/sortTickets.ts
```

* modify:

```text
src/features/tickets/TicketList.tsx
```

to use it.

The sorting change must:

* be present in the sole branch implementation commit;
* be behaviorally visible;
* live inside the same broad tickets directory as the selected inspector feature;
* not be required by the inspector feature;
* later be expected to remain absent from `combined-result`.

Do not identify the sorting hunk through machine-readable production metadata.

---

### 11. Incompatible fixture setup

Create a dedicated incompatible route-state variation without implementing merge or refusal logic.

Preferred design:

* positive branches use:

  * `/tickets?ticket=TCK-102`;
* incompatible branch uses:

  * `/tickets/TCK-102`;
* the incompatible variation changes the selected-ticket route contract and associated hook or navigation behavior.

Suggested branch:

```text
branch-inspector-path-route
```

The incompatible branch must:

* build independently;
* pass its own tests;
* have a clear route model;
* remain separate from the positive `branch-inspector`;
* not contain hard-coded future refusal logic.

The incompatible branch may have one broad implementation commit.

Its commit message must not encode a future merge recipe.

---

### 12. Anti-cheating requirements

The fixture must not allow future Phase 0 to pass through commit-level or fixture-specific shortcuts.

Do not create or expose:

* clean feature-only commits;
* separate unrelated-change commits;
* commit ordering that isolates useful changes;
* feature-specific tags;
* precomputed feature patches;
* a prepared `combined-result`;
* runtime feature manifests;
* component-name-to-file maps;
* branch-specific production allowlists;
* comments marking files as selected dependencies;
* JSON identifying which files belong to a visual feature;
* generated `include` or `exclude` lists consumed by production code;
* test metadata declaring production ownership;
* documentation parsed by production code;
* commit-message parsing;
* branch-name parsing;
* fixture-script parsing by production code.

Production code must never depend on:

```text
commit messages
branch names
documentation
Codex prompts
fixture verification expectations
fixture generation internals
manually maintained feature file lists
```

The fixture-generation script necessarily knows how to construct fixture files. That knowledge must remain fixture-only setup logic and must not be exposed as a production-readable dependency map.

Fixture verification may contain expected fixture assertions. Keep it isolated under fixture/test infrastructure. No future production package may import it.

Tests must define behavior, not feature ownership.

Human-readable documentation may state expected included and excluded behavior for evaluation. It must not be used as executable merge input.

---

### 13. Fixture verification script

Create:

```text
scripts/verify-phase0-fixture.ts
```

It must verify at least:

* generated fixture repository exists;
* generated fixture working tree is clean;
* required branches exist;
* both positive branches descend directly from the expected shared `main` base;
* `branch-sidebar` is exactly one meaningful implementation commit ahead of base;
* `branch-inspector` is exactly one meaningful implementation commit ahead of base;
* the sole `branch-sidebar` commit contains:

  * the sidebar feature implementation;
  * the unrelated heading change;
* the sole `branch-inspector` commit contains:

  * the inspector feature implementation;
  * the unrelated sorting change;
* cherry-picking the sole sidebar commit into `main` would include both sidebar and heading changes;
* cherry-picking the sole inspector commit into `main` would include both inspector and sorting changes;
* no feature-only or unrelated-only branch commits exist;
* no feature-specific tags exist;
* no precomputed selected-feature patch exists;
* positive branches do not contain one another’s selected behavior;
* no `combined-result` branch exists;
* required package scripts exist;
* fixture generation is reproducible without hidden manual changes.

The verification script is fixture test infrastructure only.

Clearly label it as non-production.

No production package may import it.

Do not expose its expected file checks through a reusable runtime manifest.

Hard-coded fixture assertions are acceptable inside this isolated verification script because its job is to validate the controlled experiment—not to determine future merge dependencies.

---

### 14. Build-all and test-all commands

Add root commands that verify every fixture branch independently.

For each required branch:

* install dependencies with the pinned package manager;
* run strict typecheck;
* run unit/component tests;
* run production build;
* run Playwright tests where the environment supports them.

The command must fail when any required branch fails.

Do not manually switch a branch in a working directory while a development server is running.

Use temporary worktrees for multi-branch verification where practical.

If Playwright browser installation is unavailable:

* do not mark Playwright as passed;
* report the environment blocker;
* provide the exact required command;
* keep the test configuration present and reviewable.

---

### 15. Root-level fixture bootstrap tests

Add root-level tests for fixture creation and verification.

Use temporary directories.

Required happy-path coverage:

* fresh fixture generation succeeds;
* required branches and ancestry are created;
* positive branch commit counts are correct;
* fixture verification succeeds.

Required failure-path coverage:

* target directory exists and is dirty;
* required branch is missing;
* positive branch does not descend from expected base;
* `branch-sidebar` contains more than one meaningful implementation commit;
* `branch-inspector` contains more than one meaningful implementation commit;
* heading change is moved to a separate commit;
* sorting change is moved to a separate commit;
* feature-only tag or patch artifact is introduced;
* required unrelated change is absent;
* required feature source or test is absent;
* manually created `combined-result` exists.

Do not run destructive tests against the actual developer repository.

---

## Constraints

* Use React, TypeScript, and Vite.
* Use strict TypeScript.
* Use stable deterministic fixture data.
* Use accessible semantic controls.
* Keep components decomposed.
* Include meaningful hooks, utilities, types, styles, and tests.
* Include unrelated changes in the same commits as useful features.
* Keep both positive branches independently buildable.
* Keep both positive branches based on the same exact `main` commit.
* Keep external dependencies minimal.
* Commit the selected package-manager lockfile.
* Prefer deterministic scripts.
* Keep generated repositories and build output out of the outer repository.
* Document platform assumptions.
* Do not exaggerate what this task proves.

---

## Non-goals

Do not implement:

* multi-preview Studio application;
* iframes;
* route synchronization between previews;
* source instrumentation;
* React element-to-source mapping;
* selection mode;
* selection records;
* dependency extraction;
* import-graph traversal;
* Git patch generation for selected features;
* selected hunk extraction;
* three-way candidate integration;
* AST merge logic;
* `combined-result`;
* final candidate verification pipeline;
* visual regression engine;
* LLM integration;
* cloud execution;
* containers;
* authentication;
* collaboration;
* FlowCraft integration;
* support for frameworks beyond the controlled fixture.

Do not create executable placeholders that claim these systems work.

---

## Acceptance criteria

This task is complete only when all conditions below are satisfied.

### Repository and documentation

1. The outer repository contains the required documentation foundation.
2. The Phase 0 claim, limitations, and anti-cheating constraints are documented.
3. Documentation states that commit boundaries are not valid feature-isolation signals.
4. This exact Codex prompt is stored in the repository.
5. No production implementation of later Phase 0 stages exists.

### Reproducible fixture

6. A fresh clone can generate the fixture with one documented command.
7. The generated fixture is a real standalone Git repository.
8. The generated fixture contains:

   * `main`;
   * `branch-sidebar`;
   * `branch-inspector`;
   * one incompatible variation branch.
9. Both positive branches use the same exact `main` base commit.
10. The fixture-generation process is safe against dirty generated repositories.
11. The generated fixture is clean after creation.

### Commit topology

12. `branch-sidebar` is exactly one meaningful implementation commit ahead of `main`.
13. That sole commit contains:

* the complete sidebar feature;
* supporting components, hook, types, styles, and tests;
* the unrelated page-heading change.

14. `branch-inspector` is exactly one meaningful implementation commit ahead of `main`.
15. That sole commit contains:

* the complete inspector feature;
* supporting components, hooks, utilities, types, fixture changes, styles, and tests;
* the unrelated ticket-sorting change.

16. Cherry-picking either sole positive-branch commit necessarily imports both its useful and unrelated changes.
17. No feature-only commit exists.
18. No unrelated-only commit exists.
19. No tag, patch, manifest, or generated artifact isolates the useful feature.
20. Commit messages do not encode file or hunk ownership.

### Branch behavior

21. `main` provides the functional baseline support dashboard.
22. `branch-sidebar` implements all specified useful behavior.
23. `branch-sidebar` visibly includes the unrelated heading change.
24. `branch-inspector` implements all specified useful behavior.
25. `branch-inspector` visibly includes the unrelated sorting behavior.
26. The incompatible branch has its own coherent route contract.
27. Each branch builds and runs independently.

### Testing

28. Every fixture branch passes strict TypeScript checking.
29. Every fixture branch passes its unit/component tests.
30. Every fixture branch produces a Vite production build.
31. Playwright tests pass for every branch, or an explicit environment blocker is reported without false success.
32. Root bootstrap tests cover the specified happy and failure paths.
33. Fixture verification rejects separated feature and unrelated commits.
34. Fixture verification rejects a manually created `combined-result`.

### Anti-cheating

35. No production-readable component-to-file map exists.
36. No production-readable feature dependency manifest exists.
37. No production code parses branch names.
38. No production code parses commit messages.
39. No production code imports fixture-verification logic.
40. Tests define behavior rather than manually declaring source ownership.
41. The generation script does not create a prepared merge patch.
42. The generation script does not create `combined-result`.
43. The future engine could not pass merely by cherry-picking the positive branch commits.

### Safety

44. No global Git configuration was changed.
45. No remote operation occurred.
46. No unrelated history was rewritten.
47. No unknown path was destructively removed.
48. Outer and generated working trees finish clean.
49. No test was disabled or weakened to pass.
50. No `any`, `@ts-ignore`, ignored error, or mocked success was introduced merely to satisfy checks.

Failure of any mandatory criterion means the task is incomplete.

---

## Commands and tests to run

Determine exact commands from the selected package manager and document them.

At minimum run equivalents of:

```bash
# Outer repository
<package-manager> install
<package-manager> run test
<package-manager> run fixture:create
<package-manager> run fixture:verify
<package-manager> run fixture:test
<package-manager> run fixture:build-all
```

For each fixture branch, run equivalents of:

```bash
<package-manager> install --frozen-lockfile
<package-manager> run typecheck
<package-manager> run test
<package-manager> run build
<package-manager> run test:e2e
```

Also run and report:

```bash
git status --short
git branch --list
git log --oneline --graph --decorate --all

git rev-list --count main..branch-sidebar
git rev-list --count main..branch-inspector

git merge-base main branch-sidebar
git merge-base main branch-inspector

git diff --stat main..branch-sidebar
git diff --stat main..branch-inspector
```

Verify the contents of each sole branch commit:

```bash
git show --stat branch-sidebar
git show --stat branch-inspector
```

Perform temporary cherry-pick validation in disposable worktrees or temporary clones:

```bash
# Disposable validation only
git cherry-pick <branch-sidebar-commit>
# Verify both sidebar feature and heading change appear

git cherry-pick <branch-inspector-commit>
# Verify both inspector feature and sorting change appear
```

Do not perform these validations in the primary generated fixture working tree if doing so could disturb its state.

If linting is configured, run it.

Do not add linting solely for appearance when it materially expands the task.

---

## Git safety requirements

* Never modify global Git configuration.
* Use repository-local identity for fixture commits if required.
* Never push.
* Never force-push.
* Never rewrite unrelated history.
* Never delete an unknown directory.
* Never force-remove an unverified worktree.
* Refuse regeneration when generated fixture work is uncommitted unless an explicit safe recreation mode is used.
* Do not create `combined-result`.
* Preserve the shared positive-branch base.
* Keep each positive branch to one meaningful implementation commit.
* End with clean working trees.
* Report all created commits and branch SHAs.
* Preserve any preexisting outer-repository work.

---

## Required completion report

Provide a structured completion report with the following sections.

### 1. Initial inspection

Report:

* initial repository state;
* package manager detected or selected;
* existing relevant files;
* initial Git status;
* assumptions.

### 2. Files changed

List every outer-repository file created, modified, or deleted.

Group by:

* root configuration;
* documentation;
* fixture template;
* fixture generation;
* fixture verification;
* tests.

### 3. Fixture Git graph

Report:

* generated fixture path;
* `main` SHA;
* `branch-sidebar` SHA;
* `branch-inspector` SHA;
* incompatible branch SHA;
* positive-branch merge-base SHA;
* commit count from `main` to each positive branch;
* `git log --oneline --graph --decorate --all` summary.

Explicitly confirm:

```text
main..branch-sidebar = 1 meaningful implementation commit
main..branch-inspector = 1 meaningful implementation commit
```

### 4. Commit-content verification

For `branch-sidebar`, report evidence that the same sole commit contains:

* useful sidebar implementation;
* supporting files;
* tests;
* unrelated heading change.

For `branch-inspector`, report evidence that the same sole commit contains:

* useful inspector implementation;
* supporting files;
* tests;
* unrelated sorting change.

Report the temporary cherry-pick checks and confirm that commit-level isolation is impossible.

### 5. Branch behavior

For every branch, report:

* visible behavior;
* key components and supporting files;
* tests;
* unrelated changes;
* route contract;
* known limitations.

### 6. Commands run

List every meaningful command and its actual result.

Do not report commands that were not run.

### 7. Test and build results

Provide separate results for:

* outer repository tests;
* fixture bootstrap tests;
* fixture verification;
* `main` typecheck;
* `main` unit/component tests;
* `main` build;
* `main` Playwright;
* `branch-sidebar` typecheck;
* `branch-sidebar` unit/component tests;
* `branch-sidebar` build;
* `branch-sidebar` Playwright;
* `branch-inspector` typecheck;
* `branch-inspector` unit/component tests;
* `branch-inspector` build;
* `branch-inspector` Playwright;
* incompatible branch checks.

Include all failures, retries, and environmental blockers.

### 8. Anti-cheating audit

Explicitly report whether any of the following exist:

* feature-only commits;
* unrelated-only commits;
* feature-specific tags;
* precomputed patches;
* feature dependency JSON;
* component-to-file maps;
* branch-name parsing;
* commit-message parsing;
* production imports from fixture verification;
* tests exposing source ownership;
* prepared `combined-result`.

The expected answer is no for every item.

Provide file-search or repository-inspection evidence where practical.

### 9. Safety verification

Confirm:

* no global Git configuration changed;
* no remote operation occurred;
* no source branch was overwritten;
* no `combined-result` branch exists;
* generated and outer working trees are clean;
* no destructive cleanup touched unknown paths.

### 10. Decisions

Explain:

* repository layout;
* package manager;
* fixture-generation strategy;
* test framework;
* why each positive branch uses one mixed commit;
* how the unrelated changes remain behaviorally separable but not commit-separable;
* how fixture-only validation is isolated from future production code;
* how the incompatible route contract is represented.

### 11. Proven and unproven

Clearly separate:

#### Proven by this task

Examples:

* fixture can be reproduced;
* branches have correct ancestry;
* each branch builds independently;
* positive commits mix useful and unrelated changes;
* fixture tests define expected behavior.

#### Still unproven

State explicitly:

> This task does not prove visual source mapping, selection semantics, dependency extraction, exclusion of unrelated hunks, safe branch combination, incompatibility detection by UI Merge Studio, or the Phase 0 product claim.

### 12. Assumptions, limitations, and unresolved risks

List:

* environment assumptions;
* fixture-specific choices;
* anything requiring manual product review;
* risks to address before the next Codex task.

Do not begin the next task.

---

## Stop conditions

Stop and report rather than improvising if:

* the existing repository conflicts materially with this prompt;
* fixture creation would overwrite uncommitted work;
* both positive branches cannot share the same exact base safely;
* positive branch changes cannot be placed into one mixed commit each;
* required tests can pass only through weakened assertions or types;
* a dependency requires credentials or an external service;
* browser tests cannot run in the environment;
* the fixture would need a feature manifest or production-readable file map;
* implementing this task would require beginning preview, mapping, dependency-analysis, or merge-engine work.

Do not broaden the task to work around a stop condition.

---

## Final instruction

Build only the repository and controlled fixture foundation described above.

Each positive candidate branch must contain its useful feature and unrelated change in the same commit.

The future UI Merge Studio engine must eventually separate those changes from visual source selection and dependency evidence—not from commit organization.

Do not implement the UI Merge Studio product pipeline yet.

---

# 3. Checklist for Reviewing Codex’s Completion Report

## Repository safety

* [ ] Codex inspected the repository before editing.
* [ ] No preexisting work was overwritten.
* [ ] No global Git configuration was changed.
* [ ] No remote operation occurred.
* [ ] Outer and generated working trees are clean.
* [ ] No `combined-result` branch exists.

## Git graph

* [ ] Both positive branches start from the exact same `main` SHA.
* [ ] `branch-sidebar` is one meaningful commit ahead of `main`.
* [ ] `branch-inspector` is one meaningful commit ahead of `main`.
* [ ] No hidden preparatory, feature-only, or unrelated-only commits exist.
* [ ] Commit messages are neutral and do not reveal dependency ownership.

## Mixed branch commits

* [ ] The sole sidebar commit contains the full sidebar feature.
* [ ] The same sidebar commit contains the unrelated heading change.
* [ ] Cherry-picking it imports both.
* [ ] The sole inspector commit contains the full inspector feature.
* [ ] The same inspector commit contains the unrelated sorting change.
* [ ] Cherry-picking it imports both.

## Fixture quality

* [ ] Features span multiple components and supporting files.
* [ ] Sidebar uses a hook, types, styles, and behavioral tests.
* [ ] Inspector uses hooks, utilities, types, styles, fixture changes, and behavioral tests.
* [ ] Sorting is inside the same broad tickets area as the inspector.
* [ ] The positive demo is not reducible to copying one file.
* [ ] The incompatible branch has a real competing route-state contract.

## Anti-cheating audit

* [ ] No production-readable feature manifest exists.
* [ ] No component-to-file map exists.
* [ ] No precomputed selected patch exists.
* [ ] No feature-specific tags exist.
* [ ] No production code parses branch names.
* [ ] No production code parses commit messages.
* [ ] No production code imports fixture-verification logic.
* [ ] Tests describe behavior rather than source ownership.
* [ ] Documentation is not executable merge input.

## Verification

* [ ] Every branch passes strict TypeScript.
* [ ] Every branch passes unit/component tests.
* [ ] Every branch builds independently.
* [ ] Playwright ran successfully, or Codex clearly reported the exact environment blocker.
* [ ] Bootstrap failure paths were actually tested.
* [ ] Fixture verification rejects separated useful and unrelated commits.
* [ ] Fixture verification rejects a manually created `combined-result`.

## Scope control

* [ ] Codex did not implement previews.
* [ ] Codex did not implement source instrumentation.
* [ ] Codex did not implement element-to-source mapping.
* [ ] Codex did not implement dependency extraction.
* [ ] Codex did not implement candidate generation.
* [ ] Codex did not implement merge or refusal logic.
* [ ] Codex explicitly states that the core Phase 0 claim remains unproven.
