# ADR 0014: Canonical Integration Plan and configured runtime

Status: Accepted (Phase 4)

## Context

The recorded Product Catalogue proof contains 64 candidates: sidebar present/absent multiplied by every subset of five Quick View targets. Adding category membership, permanent default, heading, and count options would multiply that matrix without adding engineering confidence. A candidate key therefore remains useful as historical evidence, but cannot be the product's integration-intent model or normal preview resolver.

## Decision

Integration intent is one generic `IntegrationPlanV1`: a versioned base foundation plus ordered selections containing capability identity/kind, source ownership, route/page ownership, targets, and adapter-owned configuration. The Product Catalogue adapter validates and normalizes its category and product metadata before any projection. Exact duplicate decisions collapse; incompatible duplicates and invalid ownership/configuration are refused in product language.

Canonical order is page, route, capability family, and repository metadata order. Category and Quick View targets use adapter metadata order. Stable JSON recursively sorts object keys and omits undefined values. The filesystem-safe identity is `plan-v1-` plus a deterministic FNV-1a hash of canonical JSON. It excludes timestamps, artifact paths, and temporary preview context.

Quick View “all products” is an atomic UI/history transition that deterministically expands into the five existing instance selections. This preserves exact per-product generation behavior and makes the durable plan independent of how the user invoked the selection.

Four explicit, typed projections consume the same validated plan:

- preview: sidebar configuration, exact Quick View targets, ownership, and refusal state;
- generation: foundation, selected capabilities, source ownership, and AST configuration values;
- verification: exact positive/negative UI expectations and unrelated-change exclusions;
- evidence: grouped product-language route/page summaries.

History stores complete canonical plan snapshots. Editor drafts and temporary browsing context remain separate; Apply replaces the one sidebar decision. Compatible browsing context is preserved, while incompatible context falls back to the permanent default with an announcement.

Combined Result is a mounted configuration-driven runtime. It consumes the preview projection, updates without looking up an artifact, and is labelled “Configured preview.” The hosted browser does not claim to create a Git branch. Historical branch artifacts continue to power side-by-side source-backed comparisons and optional evidence. The 64 candidates remain byte-for-byte historical parity evidence and are not regenerated or expanded.

The incompatible numeric Product-ID decision may exist in history as a refused plan. Preview/generation success is not claimed; removing it restores the safe plan without clearing other decisions.

## Adapter contract

A future repository adapter must provide foundation validation, known capabilities, source branches, route/page ownership, stable target metadata and ordering, configuration schemas/defaults, product labels/refusals, and deterministic preview/generation/verification/evidence projections. The generic core contains no Product Catalogue names.

## Consequences and future work

This removes the exponential artifact dependency and supports configurations absent from the matrix. Local source delivery still uses AST-backed transforms and stale-source checks; foundation selection, worktree/branch delivery UI, commit, push, and pull requests remain future work. Arbitrary repositories still require an adapter, and hosted rendering is not proof of local Git delivery.
