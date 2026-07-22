# ADR 0005: AST-based test-unit slicing

Status: Accepted

## Context

Prompt 004 conservatively associated an entire changed test file when its static module graph reached an analyzed feature. The inspector fixture deliberately puts relevant activity/filter behavior and unrelated sorting behavior in that same file, so whole-file inclusion could not prove a safe feature slice. Test titles, fixture paths, branch names, and expected-output tables are forbidden ownership semantics.

## Decision

Extend the Babel source index with explicit test units for conventional static `describe`, `test`, `it`, lifecycle hooks, supported modifiers, local helpers/constants, callback source regions, lexical parents, references, imports, and static literals. Map Git hunks to the smallest supported unit or support declaration.

A changed test is relevant when a static import/reference or a transitively referenced local helper reaches an included production declaration. For the controlled render-helper pattern, an exact callback literal may also connect to production when every declaration owning that literal is already in the reachable production slice. This is a generic source-evidence rule; test titles are retained only for human-readable output.

Include enclosing suites for structure, lexically applicable hooks, transitively required local support declarations, and required import bindings. Classify imports independently per specifier so one mixed declaration can contain both required and excluded bindings. Emit excluded test units and import specifiers with affirmative evidence when the supported analysis is complete.

Return `test-units` only when the separation is structurally complete. Inseparable shared setup or hunks, unresolved support imports, unsupported callbacks, dynamic/custom factories, and computed registration produce `partial` or `refused` test-file modes and prevent an overall false `resolved` status. The analyzer never executes test code, uses runtime coverage, or rewrites a test file.

## Consequences

- The inspector slice includes the activity/clipboard test and excludes its sibling sorting test while retaining shared `renderApp` and testing-library bindings.
- Sidebar analysis retains its relevant test unit without acquiring inspector units.
- Nested suites, scoped hooks, helpers, fixture constants, aliases, and mixed imports have deterministic structural representations.
- The artifact contains enough region and import evidence for a later reconstruction experiment, but no reconstruction or candidate branch is performed here.
- Dynamic/custom DSLs and semantically inseparable setup remain outside the resolved contract.
- Prompt 004 is PASS only for the supported controlled-fixture syntax; arbitrary test-file slicing remains unproven.
