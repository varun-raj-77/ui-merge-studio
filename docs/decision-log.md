# Decision log

# Prompt 010 decisions

- Keep Showcase navigation and selections in component memory only. Do not encode a phase or candidate in URL state, history, storage, cookies, or a server.
- Model feature choices as independent booleans and make each highlighted control an `aria-pressed` toggle. Candidate generation is valid only when both required selections are active.
- Treat Base, Navigation source, Activity source, and Combined result as inspection-only preview state. Changing those tabs never changes the candidate selection set.
- Preserve selections when returning from the result to comparison; clear selections, phase, preview, progress, and evidence disclosure on restart or exit.
- Label verification progress as a replay of committed gates. Keep the real Git and verification boundary in local engine mode.
- Convert illustrative sample controls to styled text when they have no Showcase action. Keep only genuine actions as buttons or links.
- Use an inline evidence panel backed by the repository's existing controlled-run claims and link to the evaluation document; do not invent run-specific cloud metrics.

# Prompt 009 decisions

- Make the static production build default to Showcase Mode while preserving the existing local engine UI in development and behind `?mode=local`.
- Keep the hosted boundary explicit: it replays a committed successful controlled run and never claims to create worktrees, branches, or verification processes in the browser.
- Use interactive React reconstructions of the sample base, navigation experiment, activity-filter experiment, and combined result. Screenshots are not used as the interaction.
- Reuse the established Compare → Select → Combine → Verify information architecture and controlled sample labels.
- Keep candidate generation, dependency slicing, merge, and verification packages untouched.
- Use a static Vite artifact plus Vercel SPA fallback, requiring no hosted repository access or secrets.

# Prompt 008 decisions

- Treat the original external validation branches as insufficient for dependency-generation evidence because each was only a three-line literal change. Preserve them and create bounded descendants with one direct dependency, one transitive dependency, and one unrelated visible edit each.
- Configure repository path, refs, preview route, candidate ref, and verification commands through validated environment input. Component names, source paths, labels, and expected files remain absent from production configuration.
- Keep the visual selection causal: runtime source identity feeds the existing Git/AST analyzer; its resolved slices are the only generator inputs.
- Reconstruct typed arrow components from the complete variable declaration statement. The prior mismatch between indexed `VariableDeclarator` offsets and transformation `VariableDeclaration` offsets caused a valid external candidate to refuse; the fix is generic and regression-tested.
- Retain the successful external candidate for review. Repeated identical generation must recognize the same tree, while an existing divergent tree remains protected.
- Use a real alternate edit of `PageContent` for failure evidence. Preflight refuses the competing declaration before any candidate worktree or ref mutation.
- Do not invent an external test command. Record the absence of an application test suite and use its real typecheck, lint, production build, and browser behavior gates.

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

# Prompt 006D decisions

- Treat the homepage tokens—ink, warm ivory, white, soft/light stone, graphite, and signal orange—as the single Guided Mode system; reserve the dark surface for contextual technical evidence.
- Keep guided source identity read-only. The controlled demo always compares `branch-sidebar` and `branch-inspector`; future repository onboarding owns branch configuration.
- Put workflow and layout controls in one compact product header, then reduce the workspace introduction to one title, one sentence, and two contextual evidence links.
- Make each preview card consist of experiment identity, raw ref, live/restart state, compact selection state, and the live application. Runtime/session/protocol details remain in the evidence drawer.
- Use ink text on signal-orange controls so the accent remains legible without relying on white-on-orange contrast.
- Keep generation, refusal, polling, synchronization, candidate, and cleanup behavior unchanged; this pass changes presentation metadata, UI copy, layout, and affected assertions only.

# Prompt 007 decisions

- Stop the real-repository experiment before branch preparation because FlowCraft is Next.js 14 while the only runtime integration executes Vite directly and the prompt forbids adding Next.js support.
- Do not reinterpret a framework-startup incompatibility as an evidence-backed feature-combination refusal. No live mapping means there are no legitimate visual seeds, dependency slices, exclusions, or candidate plan.
- Preserve FlowCraft at `261ab0f`; create no validation refs, worktrees, commits, or candidate branch.
- Classify the result as **ABANDON**, not MODIFY: the current runtime/source-mapping boundary is fixture-specific at the first causal step.
- Keep the required UI corrections bounded: an in-flow sticky action dock, one grouped preview-control cluster, and deterministic Sample Support Desk fixture branding.
- See ADR 0009 for the framework boundary and the conditions for a future retry.
