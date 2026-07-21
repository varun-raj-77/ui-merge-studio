# Risk register

| Risk | Consequence | Response |
| --- | --- | --- |
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
