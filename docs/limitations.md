# Limitations

- The hosted sample cannot access a visitor’s repository or perform Git, package-manager, source-mutation, branch-creation, or verification operations.
- Hosted outcomes are bounded to committed controlled evidence. Arbitrary selected combinations must be evaluated locally.
- Local repository support currently targets React + TypeScript + Vite with npm, pnpm, or yarn.
- Next.js, arbitrary monorepos, server-component ownership, cloud execution, collaboration, and billing are unsupported.
- Source analysis is conservative for dynamic imports, path aliases, factories, render props, class components, portals, CSS-in-JS, and inseparable mixed-file changes.
- Test slicing supports conventional static test structure; unsupported dynamic factories or mixed setup are refused or marked partial.
- External candidate generation is proven on one unrelated Vite repository without application-owned tests. Broader generalization remains unproven.
- FlowCraft uses Next.js 14 and cannot be launched or instrumented by the current Vite adapter.
- Shared preview context requires a repository adapter that can translate application state into the typed protocol. The controlled Product Catalogue proves category, selected product, Quick View, route, viewport, and normalized scroll; it does not prove authentication, backend state, or framework-independent state discovery.
- Search and sort fields are present in the protocol, but the controlled fixture has no real visible search or sort controls, so those fields deliberately fall back to empty search and `featured` sort rather than claiming a UI proof.
- Scroll transfer uses clamped normalized ratios. It preserves relative position across sufficiently similar layouts but intentionally does not promise exact pixel alignment across structurally different candidates.
- Capability fallbacks are deterministic and non-blocking, but a repository adapter must provide stable category and product identifiers for meaningful cross-version restoration.
- Selection capabilities depend on repository or fixture metadata that identifies a safe source boundary. Arbitrary DOM elements are not selectable because visual containment alone cannot prove declaration ownership, dependencies, tests, or safe isolation.
- The controlled catalogue supports the Category sidebar as a whole feature, a configured category subset with a permanent default, each Quick View as an instance, and all five Quick Views as one atomic all-instances action.
- The hosted configured preview is an honest browser-side preview over a matching recorded candidate; it does not create a Git branch. Local candidate generation owns the deterministic AST source mutation and verification path.
- Category configuration currently controls retained category options and the permanent default only. Heading and product-count visibility remain future 3B2 work; local branch-delivery UI and broader configurable feature families remain Milestone 4 work.
- Configurable source generation requires an explicitly exported, slice-owned constant whose source shape and inspected content remain valid. Unknown categories, empty subsets, disabled defaults, missing parent selections, stale source, malformed syntax, and incompatible initializer shapes are refused.
- Route and page ownership are retained and grouped in the selection dock. Feature relocation is excluded; future multi-route integrations must render each feature only on its original route.

Correct refusal is a product capability, not a failure to be hidden.
