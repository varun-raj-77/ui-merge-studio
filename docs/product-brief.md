# Product brief

Source of truth: **Visually select preferred features from multiple running React branches and create one verified combined branch.**

The exact Phase 0 claim is: **A developer can select two preferred features directly from two running React branches, and the system can create one functioning combined branch without the developer manually identifying source files.**

Initial scope is one trusted local developer, local Git repositories and worktrees, React, TypeScript, Vite, and npm/pnpm/yarn. The controlled fixture provides trustworthy inputs and a component-boundary selection contract: selection identifies a rendered component boundary, then a future system must establish source identity and derive changed symbols/hunks plus static dependencies relative to the common ancestor.

This work does not prove source mapping, dependency slicing, branch combination, or the Phase 0 claim. Multi-framework support, cloud execution, collaboration, authentication, containers, LLM integration, and production deployment are non-goals.

