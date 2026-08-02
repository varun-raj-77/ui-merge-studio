# ADR 0013: Configurable feature source transforms

## Status

Accepted.

## Context

A visible feature can be safe to select as a whole while also exposing a smaller, explicitly configurable decision. Category browsing is temporary preview state; retained categories, the default category, heading visibility, and product-count visibility are permanent source decisions. Treating these as preview context would silently change generated code, while adding every combination to the recorded candidate matrix would make the existing 64-state proof unbounded.

## Decision

Use a typed repository adapter to define canonical option order, capability ownership, source path, and exported declaration name. Normalize and validate the complete configuration before assigning a filesystem-safe identity. The configured preview, selection dock, history, and source generator consume the same canonical object. Product counts are derived from the complete repository catalogue, including enabled categories with zero matching products; they are not stored as editable configuration or display constants.

The local generator mutates only an explicitly exported `const` through the existing Babel AST path. It verifies slice ownership, branch/base identity, optional inspected-source hash, exported-const form, and compatible initializer shape. It refuses stale, malformed, incompatible, unknown, empty, disabled-default, and missing-parent requests.

Configuration identity remains separate from the historical candidate key. The browser labels the dynamic result “Configured preview” and reuses the matching recorded candidate artifact; it does not claim a branch exists. The 64 recorded candidates and their keys remain unchanged.

## Consequences

- Checkbox order and duplicate input cannot change identity or output.
- Appearance changes extend configuration identity without extending candidate identity or the 64-candidate matrix.
- One customization is one undoable selection-history transition.
- Supported temporary browsing context survives; unsupported context falls back visibly to the permanent default.
- Repository-specific filenames and category IDs stay out of the generic AST transform.
- New configurable feature families require adapter metadata and an explicitly exported configuration boundary.
