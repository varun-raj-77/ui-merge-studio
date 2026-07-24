# ADR 0009: Real-repository runtime boundary

## Status

Accepted — Prompt 007 concludes **ABANDON**.

## Context

FlowCraft is a real Next.js 14 application. UI Merge Studio currently creates detached worktrees but always launches Vite, injects selection metadata with a Vite serve transform, probes `/tickets`, and detects a support-ticket route contract from one fixture file.

Prompt 007 explicitly prohibits implementing Next.js support. Substituting Vite, bypassing Next compilation, selecting files manually, or broadly merging branches would break the rule that visual selection causally constrains source integration.

## Decision

Stop before validation-branch creation. Do not claim a feature-level refusal because no FlowCraft runtime selection or source identity exists. Preserve both repositories and classify the experiment as ABANDON.

## Consequences

A future retry requires a framework-neutral repository descriptor plus a Next.js development adapter that can:

- launch the repository’s real command in an isolated worktree;
- inject the same source-identity/runtime bridge through the Next compiler;
- probe a configured route;
- expose repository-specific synchronization capabilities without fixture semantics;
- preserve the existing session/origin/commit trust boundary.

Only after those prerequisites pass should FlowCraft validation branches be created.
