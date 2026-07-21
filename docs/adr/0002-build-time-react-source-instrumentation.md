# ADR 0002: Build-time React source instrumentation

Status: accepted for the Phase 0 experiment.

## Context

Visual selection requires a rendered project-owned component boundary to retain the identity of the React definition that produced it. DOM classes, bundle locations, names alone, fixture maps, and React Fiber are either ambiguous or forbidden.

## Decision

Use a custom Babel AST transform in a Vite plugin with `apply: 'serve'`. It recognizes conventional PascalCase function declarations, function expressions, and arrow components in project-owned `.jsx`/`.tsx` files. It derives definition line and one-based column from the parser location and adds serialized metadata only to eligible returned host roots. Stable definition IDs hash repository-relative path, definition position, and static name. The browser runtime assigns a distinct instance ID to each instrumented host DOM node.

React private internals are rejected because Fiber is undocumented, version-sensitive, and unnecessary when build-time source evidence is available. Production builds do not run the plugin, so metadata and the selection runtime are removed by construction.

## Boundary semantics

An eligible boundary is the nearest instrumented project-owned function component host region. Nested components retain separate attributes on nested host roots, enabling explicit ancestor walking. Repeated instances share definition identity but receive separate runtime IDs. Conditional host roots are instrumented in each supported branch. A wrapper that returns only another custom component remains transparent so it cannot erase a meaningful descendant.

Fragments have no natural DOM root. Direct top-level host siblings receive the same definition identity and `partial` confidence, but separate runtime instances and highlight rectangles. This avoids semantic wrappers and avoids pretending disjoint nodes are one region. Fragments whose top-level output is only dynamic/custom delegation remain unsupported unless an eligible descendant provides its own boundary.

## Runtime and bridge

Metadata contains repository-relative path, one-based line/column, component/export names when static, branch identity, definition boundary ID, and confidence. Absolute source paths stay on the host. Studio and preview exchange only the seven documented preview messages and four commands through a versioned schema. Both directions validate the expected origin; the preview also verifies the parent window. Malformed metadata, stale versions, missing boundaries, and unavailable ancestors produce explicit refusals.

## Unsupported patterns

Class components, dynamic component factories, portals, server components, ambiguous render-prop ownership, source outside the repository, and wrapper-only definitions without an eligible descendant are not mapped. Correct refusal or transparency is preferred to guessing.

## Consequences

The controlled fixture can test accurate rendered definition mapping without source maps or fixture knowledge. Costs include development DOM metadata, transform-version sensitivity, partial fragment semantics, and a conventional-function-component eligibility contract. This decision does not address dependency extraction or merging.

