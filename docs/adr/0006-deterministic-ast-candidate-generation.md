# ADR 0006: Deterministic AST candidate generation

## Status

Accepted for the controlled deterministic-candidate experiment.

## Context

A resolved feature slice proves bounded ownership but is not an executable patch. Copying branch files or commits would retain intentional unrelated edits. Candidate construction must compose two exact analyzed states, explain every write, and leave no successful branch after an unsafe or failing run.

## Decision

Generation accepts exactly two immutable schema-v2 artifacts plus repository, exact base commit, and constrained candidate branch. It revalidates hashes, selections, evidence, merge base, live feature commits, repository cleanliness, and unique identities without re-analysis.

Before mutation it derives a stable operation plan. Each operation records provenance commit/path/region, target AST identity/region, evidence IDs, base and declaration preconditions, expected result hash, and deterministic identity. Semantically identical operations coalesce with both slice identities. Competing declaration content, whole-file content, import locals, export names, or overlapping regions becomes an explicit conflict.

The executor creates a detached temporary worktree at the exact base. Its ownership taxonomy distinguishes `declaration-owned-source`, `region-owned-integration`, `exclusive-atomic-dependency`, and conservative/refused transfer. Modified TypeScript/TSX declarations and integrations are located and replaced by Babel AST identity. Added external source modules are reconstructed from supported reachable declarations and imports; unsupported top-level syntax, program directives, dynamic exports, or unresolved test support refuses. Tests may be reconstructed from retained test units, imports and supported static named re-exports are reconciled, and files reparse after structural writes.

External global CSS is currently refused because CSS rule ownership is not implemented. Assets may travel only as exclusive atomic dependencies whose project references are proven to belong to the selected declaration graph; asset bytes themselves are not semantically ownership-analyzed. Unsupported deletion, ambiguous structure, non-exclusive assets, and every transfer without supported ownership evidence refuse conservatively.

The executor compares planned and actual paths, stages and checks whitespace, then runs deterministic install, typecheck, full tests, focused feature tests, and build. Only the verified tree may become `combined-result`. Fixed metadata creates a deterministic controlled commit. An existing equal tree is idempotent success; a different tree is preserved and refused. Reports persist outside the candidate, and positively identified worktrees are removed on every outcome.

## Consequences

This prevents last-write-wins, source-ref mutation, unverified ref registration, and fixture-commit copying. It produces machine-readable provenance and manual next steps. It costs repeated parsing and full verification and is deliberately conservative. The result proves one controlled React/TypeScript composition, not arbitrary semantic branch merging or production readiness.
