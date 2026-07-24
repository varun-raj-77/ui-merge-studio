# Decision log

- Prompt 006 makes Guided Mode the default information architecture: Compare → Select → Combine → Verify. Technical evidence remains complete but moves into a focus-managed drawer.
- Preview launch is an acknowledged operation, not a request held open until Vite is ready. Operations have explicit pending/running/ready/failed/cancelled/superseded states and measured phase events.
- A slot reuses only its own unchanged detached worktree. This preserves checkout and dependency isolation while reducing warm dual restart from roughly 22 seconds to under 4 seconds on the measured machine.
- Identical in-flight requests coalesce. A different request for the same slot aborts and waits for predecessor cleanup before starting. Left and right slots remain safely concurrent.
- Browser polling is a single awaited loop with bounded backoff, one active controller per slot, terminal-state stop, stale-operation rejection, and unmount cancellation.
- Visual selection immediately starts the existing generic Git/AST analyzer. The analyzer’s real integration-boundary expansion is used as the meaningful feature result; scenario labels only translate validated component identities for display.
- Candidate preflight becomes an automatic read-only safety check. Candidate mutation still requires the one explicit **Create combined branch** action.
- Candidate progress is emitted from actual generator stages, operations, verification commands, commit registration, and cleanup. The UI may translate a slice ID to its presentation label, but the generator never receives fixture feature names.
- See ADR 0007 for the product/operation boundary.

- Prompt 005 treats the exact schema-v2 artifacts as immutable inputs and produces a complete deterministic plan before mutation. Equivalent semantic requirements are coalesced while retaining every slice/evidence ID; incompatible AST/import/export/region ownership refuses.
- Candidate construction uses a detached worktree at the exact base. The ref is registered only after changed-file audit, whitespace check, install, typecheck, full and focused tests, and build. Fixed commit metadata and normalized text EOFs make the controlled output repeatable.
- Modified source and tests are reconstructed by AST identity. Whole added blobs require full slice ownership; mixed CSS, deletion, dynamic exports, unresolved helpers, and ambiguous structure refuse. Existing equal candidate trees are idempotent; different trees are preserved. See ADR 0006.

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
- Prompt 004 resolves each live branch commit and its merge base with `main`, then indexes Git blobs rather than executing checkout source.
- A reusable Babel AST index records modules, declarations, static imports, supported exports/re-exports, JSX references, styles, assets, and test relationships. Regex is limited to Git hunk headers and non-language classification.
- Feature evidence uses typed edges; inclusion is limited to changed declarations reachable from the selected/expanded boundary, changed integration steps, direct changed assets, statically registered styles, and statically related changed tests.
- Added selected components escalate through changed reverse JSX integration edges until an existing base composition boundary is reached. The expansion is explicit in the artifact and UI.
- CSS remains a conservative whole-file fallback. Supported changed test modules are indexed below file level into suites, tests, lexical hooks, local support declarations, and import specifiers; unsupported or inseparable test syntax produces explicit partial/refused evidence. Unchanged base dependencies remain evidence only, never branch changes to copy.
- Exclusions distinguish affirmative `proven-unrelated` results from `not-reached-by-supported-analysis`; unresolved mechanisms force `partial` or `refused` status.
- Deterministic JSON omits timestamps, uses resolved commit identities and stable ordering, and hashes normalized slice content for the analysis ID.
- See ADR 0004 for the Git/AST evidence-slicing boundary.
- Prompt 004B connects test units to included production declarations with static symbol/helper edges and exact, uniquely-owned callback UI-contract literals. Test titles, branch names, paths, and fixture expectations never determine relevance.
- Required and excluded imports are represented per specifier, including mixed declarations and aliases. Enclosing suites and applicable hooks are retained structurally; unrelated sibling tests and scoped hooks are excluded.
- See ADR 0005 for the AST test-unit slicing boundary and conservative fallback rules.
# Prompt 006C decisions

- Keep overview/workspace navigation in React state so active previews survive and no routing dependency is added.
- Require explicit confirmation after source-backed analysis before compatibility planning.
- Reuse the right preview slot for the activity source and verified result, avoiding three unusably narrow simultaneous panes.
- Keep raw branch refs secondary and technical evidence contextual.
- Use scenario metadata only for guided presentation; source analysis and generation remain evidence-driven.
