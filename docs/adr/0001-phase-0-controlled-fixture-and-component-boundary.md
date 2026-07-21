# ADR 0001: Controlled fixture and component boundary

Status: accepted.

## Context

The Phase 0 claim needs repeatable branch inputs without pre-solving source selection.

## Decision

Use a generated standalone dashboard repository. A user-visible selection is a rendered component boundary, not a file list. Future derivation must follow rendered selection → source identity → delta from common ancestor → static dependencies and changed symbols/hunks → bounded reconciliation → verification.

Each positive branch is one mixed commit ahead of the same base. Commit boundaries are not a valid feature-isolation signal in the Phase 0 fixture. Production code may not inspect branch names, commit messages, fixture scripts, documentation, verification expectations, or test metadata to determine ownership.

## Consequences

The fixture can validate topology and behavior while leaving the hard claim unproven. Inspector/list proximity and a conflicting route contract prevent an artificially trivial graph. Fixture-specific checks remain isolated from production architecture.

