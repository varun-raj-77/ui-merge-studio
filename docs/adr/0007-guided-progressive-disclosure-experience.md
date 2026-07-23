# ADR 0007: Guided progressive-disclosure experience and asynchronous preview operations

- Status: accepted
- Date: 2026-07-23

## Context

Prompts 001–005 proved the controlled technical path, but the Studio exposed that evidence as one long diagnostic page. Preview launch POST requests also remained pending for the full Git worktree, dependency installation, Vite startup, and readiness wait. The product looked frozen even when the backend was working.

## Decision

Guided Mode is the default UI. It presents Compare → Select → Combine → Verify, named fixture variants, automatic analysis after a visual choice, one persistent combine action, and readable states. Complete source and operation evidence remains available in a modal technical drawer.

Preview launch uses a server-owned operation record. POST validates the input, records `request-received` and `queued`, and returns HTTP 202 with an operation ID. A separate GET returns pending/running/ready/failed/cancelled/superseded state, phase timings, a terminal session, or an error. DELETE cancels. Identical active work coalesces; different same-slot work supersedes and aborts its predecessor. Work is serialized per slot and concurrent across slots.

The browser runs one bounded, non-overlapping poll loop per slot. Every request is awaited. An AbortController handles replacement and unmount. Only the current operation ID may update a slot.

The preview controller retains a stopped slot’s detached worktree only when its exact branch commit is unchanged. The left and right slots never share a writable dependency directory. Explicit stop and shutdown remove active processes and every prepared worktree.

Scenario labels are a presentation adapter. The engine receives no feature names or branch semantics. Visual selection still produces a validated source identity; the existing Git/AST analyzer determines the supported integration boundary and candidate inputs.

## Consequences

- Launch acknowledgement is fast and independently measurable.
- Users see actual phases rather than a fabricated progress percentage.
- Warm restarts avoid repeated locked installs without weakening runtime isolation.
- Cancellation and supersession become explicit states with cleanup ownership.
- The default surface is understandable while the proof remains auditable.
- Cold startup remains bounded by real dependency and Vite work.
- The local operation store is process-memory state; server restart discards operation history and cleans resources.
