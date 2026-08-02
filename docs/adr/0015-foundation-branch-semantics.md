# ADR 0015: Foundation branch semantics and Git common-ancestor integration

## Status

Accepted for Phase 5.

## Context

The previous canonical plan always started from Main and represented only selective additions. Starting from Version A or Version B changes the meaning of the plan: every change on that branch must be retained before selected slices from other branches are applied. A display label is insufficient because branch heads can move and branch histories can be unrelated.

## Decision

Use Integration Plan version 2. Its foundation records repository identity, exact local branch ref, pinned commit, verified common-ancestor commit, and the `base` role. Every explicit selection also pins its source commit. Foundation and source metadata participate in deterministic serialization and plan identity; temporary preview context and timestamps do not.

Main is the default. A non-Main foundation is included in full and is not counted as a selected feature. Explicit decisions from that same branch are redundant and are removed during canonicalization. A foundation change is a complete-plan history action. Compatible decisions remain; redundant decisions normalize with an announcement; conflicting changes leave the prior safe plan untouched.

Local generation resolves the pinned refs with Git, rejects stale or missing heads and unrelated histories, creates the worktree from the exact foundation commit, and applies only selected source slices relative to the common ancestor. Ordinary file overlap is not automatically unsafe. A selected slice whose required shared contract was replaced incompatibly by the foundation is refused before a successful candidate is presented.

The hosted Product Catalogue uses the same canonical plan for an adapter-driven Configured preview, verification expectations, and evidence. It does not claim to check out a Git branch. The 64 historical Main candidates remain unchanged and no static foundation matrix is created.

## Consequences

- Version-1 serialized plans are rejected rather than silently assigned new full-branch semantics.
- Larger foundations may increase generation and verification cost.
- Overrides and exclusions within a selected foundation require a future explicit model.
- The controlled one-route fixture proves ownership preservation but not arbitrary multi-route repositories.
