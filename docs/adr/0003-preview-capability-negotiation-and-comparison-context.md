# ADR 0003: Preview capability negotiation and versioned comparison context

Status: Accepted

## Context

Two branch previews can use different navigation representations even when both display the same catalogue. Treating a branch name or human-readable feature label as a route contract would make synchronization fixture-cheating. A restarted iframe also invalidates runtime instances, so branch identity alone cannot safely key bridge state.

## Decision

Every preview start creates a controller slot identity containing `previewId`, ref, session UUID, monotonically increasing generation, and bridge protocol version. Protocol v2 repeats that identity on every message and command. The Studio accepts preview events only when schema, protocol, exact allocated origin, registered iframe window, and complete identity all match.

The controlled fixture adapter inspects the checked-out catalogue-state source using the TypeScript AST and declares `catalogue-query-v1` or no route capability. It also declares a versioned product fixture-context contract and source-selection support. The central comparison model synchronizes only when both declared route and fixture-context contracts match exactly.

Local navigation emits `navigation-changed` with no operation ID. The Studio creates an operation ID and sends `sync-context` to the peer. Applying a command uses the receiving adapter and emits `preview-state` with that operation ID, never another local-navigation event. The parent does not re-propagate acknowledgements.

## Consequences

- Query-contract fixture branches synchronize without branch-name knowledge.
- An absent or incompatible contract remains usable as a preview but is not guessed into alignment.
- Restarted runtime IDs and late events cannot be treated as current evidence.
- Adding another router requires an explicit adapter/capability implementation.
- This architecture does not claim synchronization of arbitrary application or store state.
