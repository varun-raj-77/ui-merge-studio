# Risk register

| Risk | Consequence | Response |
| --- | --- | --- |
| Candidate branch receives partial output | Broken branch looks successful | Transform and verify in a detached worktree; register only the verified commit; always clean the worktree |
| Two slices overwrite the same source | Silent last-write-wins behavior | Group operations by AST/import/export/region identity and refuse incompatible content with slice/evidence IDs |
| Equivalent requirements duplicate code | Duplicate imports, tests, or JSX | Normalize semantic operations and retain combined provenance before applying in stable order |
| Existing candidate contains unreviewed output | User work is overwritten | Compare generated and existing trees; accept only equality and otherwise refuse without moving the ref |
| Controlled fixture success is generalized | Unsafe product claim | Document the bounded grammar and preserve conservative unsupported-operation refusal |
| Rendered element cannot be mapped reliably | Wrong source identity | Falsify early with instrumentation experiments |
| Static imports miss runtime dependencies | Broken candidate | Bound supported patterns and verify behavior |
| Selected and unrelated edits share a hunk | Unsafe exclusion | Reconcile or refuse with evidence |
| Tests become ownership metadata | Cheating fixture | Keep behavioral tests and isolated contract checks |
| Commit/branch semantics leak into slicing | Invalid result | Audit production packages and mixed commits |
| Route contracts conflict | Invalid combination | Represent incompatibility explicitly and test refusal later |
| Vite/Babel module interop changes | Preview transform fails | Pin versions and exercise the real dev-server path in Playwright |
| Wrapper component has no host root | Wrapper cannot be highlighted | Preserve meaningful descendants and document transparent wrappers |
| Fragment spans disjoint host regions | Misleading single rectangle | Mark each direct host sibling with shared definition identity and `partial` confidence |
| Runtime metadata is stale or malformed | Incorrect mapping | Validate version, branch, shape, origin, and refuse rather than guess |
| Windows child process survives parent | Leaked worktree/server | Stop process trees and force-remove only positively identified controller temp worktrees |
| Preview event impersonates another runtime | Cross-branch state corruption | Bind protocol v2 envelopes to registered origin, iframe window, preview ID, session UUID, generation, and branch |
| Reflected navigation creates a ping-pong loop | Unbounded history/message churn | Emit local navigation separately from operation-ID acknowledgements and never propagate an acknowledgement |
| Fixture route contracts diverge | Incorrect guessed navigation | Negotiate adapter-declared contracts and retain interactivity while explicitly refusing synchronization |
| Restart preserves a dead runtime selection | Misleading source evidence | Clear the restarted slot before launch and reject every envelope from the prior session/generation |
| Dynamic localhost origin weakens browser trust boundary | Malicious same-machine page attempts messages | Use exact per-session origins plus iframe-window and identity validation; do not use wildcard targets |
| Static source graph misses runtime dependency | Slice is incomplete | Bound supported edges; record unresolved imports; return partial/refused rather than infer |
| Unchanged selected source is mistaken for the branch feature | Unrelated delta is attributed to the selection | Require a reachable changed declaration or changed reverse integration chain; otherwise refuse |
| Symbol and unrelated edits share an inseparable region | Unsafe symbol-level extraction | Fall back conservatively to a whole file when justified, or mark ambiguity partial/refused |
| Style ownership is guessed from class names | Incorrect CSS inclusion | Require a supported static stylesheet import; use whole-file CSS fallback and document it |
| Broad test association turns tests into ownership metadata | Unrelated test changes enter the slice | Require static symbol/helper evidence or an exact uniquely-owned production UI-contract literal; never use titles, paths, or fixture expectations |
| Shared test setup serves included and excluded tests inseparably | A reconstructed test module is incomplete or over-broad | Detect mixed setup/hunk ownership and return partial/refused with a manual next step |
| Mixed import declaration is classified as one ownership unit | Excluded-test dependencies leak into the slice | Track required and excluded imports by local specifier, including aliases |
| Dynamic/custom test factories evade the AST unit model | Tests are silently omitted or misclassified | Record unsupported registration and refuse that test-file slice |
| Branch moves after visual selection | Artifact describes a different source state | Bind preview session to a resolved commit and reject commit/session/location mismatch |
| Deterministic artifact leaks runtime noise | Equivalent analysis hashes differ | Omit timestamps, sort every collection, and derive IDs from normalized slice JSON |
