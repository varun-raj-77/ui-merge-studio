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
