# Phase 0 evaluation

PASS requires visual component selection to lead through source identity, common-ancestor delta, symbol/hunk dependencies, bounded reconciliation, and verification to a functioning candidate that excludes unrelated edits. MODIFY applies when the claim remains plausible but a bounded contract or implementation must change. ABANDON applies when reliable separation cannot be achieved without manual file ownership, prepared patches, or metadata cheating.

Commit boundaries are not a valid feature-isolation signal. Both positive branches intentionally contain useful and unrelated behavior in one commit. Branch names, messages, documentation, generator details, verification expectations, and test metadata are forbidden production inputs. A result that can pass by cherry-picking or commit filtering fails.

This repository evaluates only fixture reproducibility, topology, behavior, and anti-cheating preconditions. It does not evaluate the future engine.

## Rendered element-to-source experiment

PASS requires generic AST instrumentation to report accurate repository-relative component definitions for baseline, sidebar, and inspector branches; nested ancestor navigation; distinct repeated runtime instances; valid line and column; preserved normal behavior; and explicit refusal when evidence is insufficient. No fixture lookup data may participate.

MODIFY applies if the mechanism remains viable but only single-root components are exact, fragment boundaries need a narrower contract, columns prove unreliable, or wrapper/ancestor behavior needs a bounded convention.

ABANDON applies if correct mapping requires fixture maps, branch semantics, React private internals, frequent guessing, behavior-changing wrappers, or identities that do not survive ordinary Vite development transforms.

Current automated evidence meets PASS for the controlled fixture. This is a prerequisite result, not proof of dependency slicing or the product claim.
