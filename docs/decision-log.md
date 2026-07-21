# Decision log

- Use npm and Node scripts for the smallest deterministic outer toolchain.
- Generate a standalone ignored Git repository from tracked templates.
- Keep both positive branches at the same exact `main` base and exactly one mixed implementation commit ahead.
- **Commit boundaries are not a valid feature-isolation signal in the Phase 0 fixture.**
- Each positive branch combines useful behavior and its required unrelated change in one commit.
- Production code must not inspect branch names, commit messages, fixture scripts, documentation, or test metadata to identify a feature slice.
- The incompatible branch uses path-based ticket selection, competing with the query-parameter contract.
- Prompt 002 uses a Babel AST Vite `serve` transform to attach definition metadata to project-owned component host roots; production builds are not instrumented.
- Runtime instance IDs are allocated per instrumented DOM root, while stable definition IDs are derived from repository-relative path, AST definition location, and component name.
- Nested eligible boundaries follow DOM ancestry. Wrapper-only components remain transparent. Fragment host siblings share a definition ID and report `partial` confidence because a fragment has no natural DOM root.
- Studio/preview communication is a versioned, origin-validated narrow `postMessage` protocol rather than a general event bus.
- Prompt 003 replaces the single active preview with controller-keyed `left` and `right` sessions. Every start gets a UUID and monotonically increasing per-slot generation; stop and restart affect only that slot.
- Bridge protocol v2 places the complete preview identity on every message and command. The parent additionally binds it to the registered iframe window and dynamically allocated origin.
- Synchronization compatibility is negotiated from AST-detected checkout capabilities. The fixture adapter recognizes its query or path ticket-navigation contract from source evidence; the comparison core does not receive a branch-name lookup table.
- Applied synchronization produces `preview-state` acknowledgement messages, while only local navigation produces `navigation-changed`; acknowledgements are never re-propagated.
- See ADR 0003 for capability negotiation and the versioned comparison-context boundary.
