# Limitations

- The hosted sample cannot access a visitor’s repository or perform Git, package-manager, source-mutation, branch-creation, or verification operations.
- Hosted outcomes are bounded to committed controlled evidence. Arbitrary selected combinations must be evaluated locally.
- Local repository support currently targets React + TypeScript + Vite with npm, pnpm, or yarn.
- Next.js, arbitrary monorepos, server-component ownership, cloud execution, collaboration, and billing are unsupported.
- Source analysis is conservative for dynamic imports, path aliases, factories, render props, class components, portals, CSS-in-JS, and inseparable mixed-file changes.
- Test slicing supports conventional static test structure; unsupported dynamic factories or mixed setup are refused or marked partial.
- External candidate generation is proven on one unrelated Vite repository without application-owned tests. Broader generalization remains unproven.
- FlowCraft uses Next.js 14 and cannot be launched or instrumented by the current Vite adapter.

Correct refusal is a product capability, not a failure to be hidden.
