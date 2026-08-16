# Prompt 013 — local canonical-plan causality proof

## Objective

Make one canonical Integration Plan V2 the causal contract between rendered selections in the real local Studio and deterministic candidate generation. Prove: “Visually select preferred features from multiple running React branches and create one verified combined branch.”

## Constraints

- Preserve the existing local UI and deterministic candidate generator.
- Keep Git, runtime, AST, dependency, and verification evidence authoritative.
- Do not trust browser-supplied artifacts, source paths, component names, dependencies, or arbitrary selection identities.
- Use the exact server-configured Main commit as the candidate parent.
- Refuse stale, unknown, tampered, cross-session, repository, foundation, source-commit, or common-ancestor mismatches before mutation.
- Include slice-owned dependencies and exclude unrelated branch changes.
- Finish in the actual generated candidate worktree preview and clean all temporary state.
- Do not expand package-manager, framework, repository-picker, deployment, cloud, or collaboration scope.

## Implemented causal path

```text
rendered click
→ opaque receipt registered by current-session server-side instrumentation
→ server-resolved SourceIdentity
→ server-owned FeatureSliceArtifact
→ server-issued stable opaque IntegrationSelection
→ canonical Integration Plan V2 + one plan identity
→ server canonicalization and identity/commit/session validation
→ trusted plan-to-generator projection
→ exact-Main candidate worktree
→ deterministic AST/dependency operations
→ install, typecheck, tests, focused feature tests, and production build
→ atomic candidate branch
→ actual candidate worktree preview
```

## Acceptance evidence

- The normal App sends exactly `{ plan, planIdentity }` to preflight and generation.
- The normal analysis request sends exactly `{ selectionReceipt }`; browser-authored source paths, component names, locations, and `SourceIdentity` objects are refused.
- The preview Vite process privately registers random receipt-to-source mappings authenticated to the exact preview session and source commit.
- The server privately associates opaque plan selections with analysis produced by the current preview sessions.
- Unknown selection coverage recomputes a valid plan identity around a nonexistent capability and proves the request is refused with unchanged branches, worktrees, and repository status.
- The candidate parent equals pinned Main `d5121870a14559404696f531636a40affc0a755e` in the controlled fixture.
- Category dependencies include `CategorySidebar`, `CatalogueWorkspace`, `useCategoryFilter`, category types/styles, and the focused category test.
- Quick View dependencies include `ProductQuickView`, `ProductCardWithQuickView`, `ProductGrid`, `useSelectedProduct`, configuration/styles, and focused Quick View tests.
- The candidate excludes Branch A's `PromotionalBanner`/`CatalogueHeader` delta and Branch B's `inventorySummary` utility/header/test delta.
- Exact serialized replay produced the same tree `5f70d002a07a301a10fd65214c9455c29f402e57`; the second result was idempotent.
- The enabled Playwright journey used rendered UI locators, created and verified the candidate through the real server, launched the generated worktree, exercised both selected behaviors, asserted unrelated behavior absent, and removed the candidate branch and preview worktrees.

## Verification evidence

- Focused trust/UI tests: 14 passed.
- Focused local Playwright journey: 1 passed, zero skipped.
- Studio suite: 118 passed.
- Source analysis: 16 passed; feature slice: 5 passed; test slicing: 12 passed.
- Candidate generation: 21 passed.
- Candidate integration: 4 passed in approximately 12 minutes.
- Fixture verification and production build passed; the Showcase manifest retained all 64 candidates.
- Full Playwright: 41 passed, zero skipped.
- Exact full Vitest: 190 passed; 3 unrelated external-repository tests remained intentionally environment-gated.

## Bounded claim

This milestone proves one repository-controlled React + TypeScript + Vite Product Catalogue journey with npm. It does not prove general Vite compatibility, pnpm/yarn execution, Next.js, monorepos, cloud Git, or arbitrary semantic merging.
