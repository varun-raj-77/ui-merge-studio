# ADR 0004: AST and Git evidence feature slicing

Status: Accepted

## Context

A rendered component identity names a source definition, but a functioning branch feature can also require changed child components, hooks, types, integration points, styles, assets, and tests. A forward import walk alone misses the parent change that introduces an added component. Whole-branch and whole-file lists cannot exclude the fixture's deliberately mixed unrelated deltas. Branch names, messages, and fixture manifests are forbidden feature semantics.

## Decision

Resolve and validate the selected preview's exact branch commit and merge base with `main`. Build a reusable Babel TypeScript/TSX index directly from Git blobs, modeling modules, supported declarations, imports, exports/re-exports, JSX references, style and asset imports, and test modules. Associate Git hunks with declaration regions and represent reasoning as stable typed graph edges.

Begin at the validated visual definition. Traverse changed project-owned dependencies forward. If an added selection is too narrow, traverse changed reverse JSX integration edges until reaching the smallest importer/composition relationship that already exists in the merge base. Record both original and analyzed boundaries and the reason for expansion. Unchanged base declarations may explain connectivity but are never emitted as branch changes.

Include changed declarations at symbol/region granularity when supported. Include CSS, assets, and module-level style registration as whole files when finer separation is not safe. Delegate supported changed test modules to the test-unit analysis defined by ADR 0005; unsupported or inseparable test files remain partial/refused. Classify every remaining branch item as affirmatively proven unrelated only when the supported graph is complete for that decision; otherwise label it unreached/unsupported. Unsupported dynamic edges, deleted/binary dependencies, stale evidence, and unresolved boundaries produce `partial` or `refused` output.

Normalize and stably sort the slice without timestamps. Derive a content-addressed 16-hex analysis ID and persist/download `.ums/analysis/<id>/feature-slice.json`. Keep analysis state per preview and mark it stale when the preview or selection is invalidated.

## Consequences

- The controlled sidebar and inspector selections produce separate deterministic slices without manual filenames or fixture lookup tables.
- Reverse integration evidence makes `ActivityFilters` expand explicitly to `TicketInspector`.
- The unrelated sidebar heading and inspector sorting implementations are excluded affirmatively.
- Whole-file stylesheet inclusion is deliberately conservative; supported tests are represented by structural units and per-specifier imports under ADR 0005.
- The analyzer remains incomplete for dynamic/runtime module semantics, aliases, arbitrary re-exports, CSS-in-JS, and inseparable shared edits.
- A resolved slice is evidence for a later integration experiment, not permission or proof that applying it is safe.
