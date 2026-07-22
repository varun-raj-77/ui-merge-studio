# Product brief

Source of truth: **Visually select preferred features from multiple running React branches and create one verified combined branch.**

The exact Phase 0 claim is: **A developer can select two preferred features directly from two running React branches, and the system can create one functioning combined branch without the developer manually identifying source files.**

Initial scope is one trusted local developer, local Git repositories and worktrees, React, TypeScript, Vite, and npm/pnpm/yarn. The controlled fixture provides trustworthy inputs and a component-boundary selection contract: selection identifies a rendered component boundary, then a future system must establish source identity and derive changed symbols/hunks plus static dependencies relative to the common ancestor.

The controlled Prompt 002 experiment provides evidence for development-time rendered component-definition mapping within the fixture's conventional React patterns. Prompt 003 adds evidence that two isolated branch runtimes can coexist, negotiate an explicit ticket-context contract, synchronize compatible route/entity changes without reflection loops, use equivalent viewport presets, and retain independent source selections. Prompt 004 proves that those real selections can seed deterministic Git/AST feature slices for both positive fixture branches, including changed dependencies and integration evidence while excluding each branch's intentional unrelated delta.

The supported analyzer models conventional static TypeScript/TSX declarations, relative imports, named/default/namespace/type imports, supported re-exports, JSX composition, direct style/asset imports, and tests that reach the analyzed boundary through static project imports. This does not prove arbitrary application-state synchronization, semantic dependency completeness, safe source integration, branch combination, or the full Phase 0 claim. Multi-framework support, cloud execution, collaboration, authentication, containers, LLM integration, and production deployment are non-goals.
