# ADR 0006: Deterministic AST candidate generation

## Status

Accepted for the controlled deterministic-candidate experiment.

## Context

A resolved feature slice proves bounded ownership but is not an executable patch. Copying branch files or commits would retain intentional unrelated edits. Candidate construction must compose two exact analyzed states, explain every write, and leave no successful branch after an unsafe or failing run.

## Decision

Generation accepts exactly two immutable schema-v2 artifacts plus repository, exact base commit, and constrained candidate branch. It revalidates hashes, selections, evidence, merge base, live feature commits, repository cleanliness, and unique identities without re-analysis.

Before mutation it derives a stable operation plan. Each operation records provenance commit/path/region, target AST identity/region, evidence IDs, base and declaration preconditions, expected result hash, and deterministic identity. Semantically identical operations coalesce with both slice identities. Competing declaration content, whole-file content, import locals, export names, or overlapping regions becomes an explicit conflict.

The executor creates a detached temporary worktree at the exact base. Fully owned added blobs may be copied after hash validation. Modified TypeScript/TSX declarations and integrations are located and replaced by Babel AST identity; partially owned added modules and tests are reconstructed from retained declarations/test units; imports and supported static named re-exports are reconciled. Files reparse after structural writes. Modified CSS is replaced only when completely slice-owned. Unsupported deletion, ambiguous structure, mixed CSS, dynamic exports, or unresolved test support refuses.

The executor compares planned and actual paths, stages and checks whitespace, then runs deterministic install, typecheck, full tests, focused feature tests, and build. Only the verified tree may become `combined-result`. Fixed metadata creates a deterministic controlled commit. An existing equal tree is idempotent success; a different tree is preserved and refused. Reports persist outside the candidate, and positively identified worktrees are removed on every outcome.

## Consequences

This prevents last-write-wins, source-ref mutation, unverified ref registration, and fixture-commit copying. It produces machine-readable provenance and manual next steps. It costs repeated parsing and full verification and is deliberately conservative. The result proves one controlled React/TypeScript composition, not arbitrary semantic branch merging or production readiness.
