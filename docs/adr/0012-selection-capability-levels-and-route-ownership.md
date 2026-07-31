# ADR 0012: Selection capability levels and route ownership

## Status

Accepted for Milestone 3A.

## Context

A visible branch difference is not automatically a safe integration unit. A complete sidebar may have one verified source boundary, a repeated Quick View may be safely configurable per product, and a single category option may share declarations and configuration that cannot yet be transformed independently.

DOM containment cannot establish source ownership, dependencies, tests, or whether a selected fragment can be generated safely. Selection also needs route ownership: a feature originating on `/settings` must not be visually pasted onto `/catalogue`.

## Decision

UI Merge Studio uses a generic typed `SelectionCapability` contract. Every capability records:

- selection level: whole feature, feature instance, all instances, configurable subset, or unsupported;
- product-facing identity and label;
- source branch;
- original route and page/workspace identity;
- included target IDs;
- support state and refusal reason;
- optional source-evidence identity.

Repository-specific adapters declare capabilities and translate supported capabilities into existing engine scopes. Core capability logic contains no Product Catalogue component names.

Selections retain capability, route, page, and branch ownership. The selection dock groups them by original route. Multiple route groups may coexist in a future combined branch, but their features remain on their own routes. Relocation is not a selection operation.

## Capability behavior

Whole-feature selection includes the complete verified feature boundary. Feature-instance selection includes one configured repeated instance. All-instances selection expands into every declared instance as one atomic history transition.

The controlled catalogue maps “Add Quick View to all products” onto the five existing Quick View instance scopes. It therefore resolves the existing canonical all-products candidate and does not add a candidate type or expand the 64-state matrix.

A configurable-subset capability can be described before its transform exists. “Customize categories” is represented with target category IDs but is not executable in Milestone 3A. The interface explains that it requires a configurable source transform.

Unsupported annotated regions receive a compact explanation instead of a misleading Add action. Arbitrary DOM selection remains excluded.

## Consequences

Capability Details can explain selection level, branch, route, support state, and included targets without exposing file paths by default. Undo and redo remain snapshot-based, so a bulk action removes or restores all expanded instances in one operation.

Candidate-key canonicalization, source slicing, dependency analysis, refusal semantics, generated source, and Git delivery are unchanged. Configurable category generation, shared dynamic configuration, drag-and-drop, feature relocation, and arbitrary DOM selection remain future or excluded work.
