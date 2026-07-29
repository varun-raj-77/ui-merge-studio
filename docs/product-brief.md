# Product brief

UI Merge Studio lets one local developer compare running React branch implementations, select preferred rendered features, trace those features to source and required dependencies, and create one verified candidate branch.

The public Product Catalogue sample demonstrates the interaction model without pretending to run Git in a browser. Baseline, Branch A, and Branch B share stable data. The visitor freely selects changes, and the selection model causes the displayed declaration, dependencies, inclusion reason, sibling exclusions, and compatibility status.

The local engine remains authoritative for worktree creation, runtime instrumentation, Git/AST analysis, candidate mutation, and verification. The hosted sample replays only committed supported or refused outcomes and labels other combinations unrecorded.
