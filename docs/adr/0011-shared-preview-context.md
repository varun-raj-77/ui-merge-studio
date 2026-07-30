# ADR 0011: Shared preview context

## Status

Accepted for Milestone 1.

## Context

UI Merge Studio previously treated each running preview as an unrelated application session. A user could browse to Desk in Version A, then see Version B or the combined candidate reset to All. That broke comparison continuity even though the candidate source was correct.

Two kinds of state must remain distinct:

- **Integration selections** identify source-backed features to include. They determine the candidate key and generated branch.
- **Preview context** describes the current browsing session. It includes route, logical viewport, normalized scroll, category, search, sort, selected product, and Quick View state.

Browsing must never silently become a source-code edit.

## Decision

The Studio shell coordinates a typed, serializable preview-context protocol. Each repository preview adapter:

1. reports capabilities and current context when ready;
2. publishes field-level changes only for intentional user interactions;
3. applies sequenced Studio commands without echoing them as new intent;
4. reports the applied context and any deterministic fallback notices.

The shell validates same-origin messages, message shape, protocol version, preview identity, revisions, and apply sequences. It rejects duplicate or stale user revisions. The latest intentional interaction owns only the fields named in that event, preventing an unrelated scroll event from overwriting category or Quick View state.

Current context is reapplied on iframe load, adapter readiness, capability changes, and candidate artifact replacement. Branch previews remain mounted while the combined view is shown, preserving their local focus and session state when the user returns.

## Capabilities and fallbacks

Capabilities cover route, viewport, scroll, category, search, sort, selected product, and Quick View, plus supported category, product, and Quick View target IDs. Unsupported values do not silently disappear:

- an unsupported category falls back to All;
- an unavailable product is cleared while other compatible context remains;
- an unsupported Quick View closes while preserving the selected product and category.

Fallbacks are compact `role="status"` notices. Search and sort remain typed but are not visibly proven because the controlled fixture has no real controls for them.

Scroll uses clamped normalized ratios, not raw pixels, and user scroll publication is debounced. Programmatic scrolling is suppressed from intent publication. Viewport dimensions are Studio-owned logical comparison context; transient dimensions below 320 pixels are ignored and resize updates are debounced.

## Repository adapter boundary

The Studio shell does not scrape arbitrary application DOM to infer React state. A repository adapter must translate stable application identifiers and user actions into the protocol. The Product Catalogue adapter uses its shared store for category and product state. It discovers rendered Quick View capability inside the instrumented fixture runtime so generated slices cannot lose a module-registration side effect.

This controlled fixture proves category synchronization in both directions, selected-product and Quick View restoration, candidate capability fallback, route representation, viewport propagation, normalized scroll, reload reapplication, and mobile preview switching.

It does not prove automatic support for arbitrary routers, state libraries, authentication, backend state, or applications without stable identifiers. Those require repository-specific adapters.

## Source and engine safety

Preview context exists only in Studio memory and runtime messages. It is not part of the integration-selection reducer, candidate key, source configuration, generated default, or future selection history. The fixture still initializes `categoryId` to `all`; selecting Desk is temporary.

Candidate slicing, dependency inclusion, candidate-key semantics, refusal rules, Quick View source configuration, Product-ID safety, and Git delivery behavior are unchanged. Hosted artifacts were regenerated only because their runtime bridge changed; the deterministic matrix remains 64 states.
