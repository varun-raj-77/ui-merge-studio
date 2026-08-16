# UI Merge Studio

**Visually select preferred features from multiple running React branches and create one verified combined branch.**

UI Merge Studio is a local developer tool for React + TypeScript + Vite repositories. It launches branches in isolated worktrees, keeps their live applications comparable, maps rendered selections to source declarations and dependencies, records the decisions in one canonical Integration Plan V2, generates a candidate from the exact pinned foundation, and runs verification.

## Interactive sample versus local engine

The hosted Product Catalogue is an interactive sample. You can compare a baseline with Branch A and Branch B, select or deselect visible changes, inspect source evidence, use a recorded combined result, and encounter an evidence-backed refusal.

The browser does **not** access Git, create worktrees, modify files, run package commands, or create a branch. Those operations are available only in local mode.

## Run locally

Requirements: Node.js 20+, Git, npm, and Chromium for Playwright.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open:

```text
http://127.0.0.1:4310/?mode=local
```

Open the hosted-style sample locally at:

```text
http://127.0.0.1:4310/?mode=showcase
```

## Proven capabilities

- Isolated local branch execution through Git worktrees.
- Generic development-time React element-to-source instrumentation.
- Synchronized compatible previews with fixed viewport presets.
- Git/AST dependency slicing from a rendered React selection.
- Exclusion of unrelated branch changes.
- One canonical Integration Plan V2 from rendered decisions to server validation, generation evidence, and the final candidate preview.
- Server-owned current-session analysis: the preview transform privately registers source mappings, normal analysis requests carry opaque session receipts rather than browser-authored source identities, and the browser cannot supply dependency lists or feature-slice artifacts as generation authority.
- Deterministic candidate generation from the common base.
- TypeScript, test, build, and runtime verification.
- Refusal before mutation for unsupported or conflicting slices.
- Bounded external Vite candidate generation on one unrelated repository.

The external proof generated a six-file candidate from base `8223897`, preserved both source branches, passed install, TypeScript, lint, build, and runtime verification, and reproduced the same candidate tree. This is evidence for one conventional Vite repository—not universal React support.

## Product Catalogue sample

The baseline is a stable product grid. Branch A adds a collapsible, filtering category sidebar plus an unrelated promotional change. Branch B adds an accessible product quick-view inspector plus an unrelated inventory summary.

The recorded supported pair is:

- Collapsible category sidebar — Branch A
- Product quick-view inspector — Branch B

The combined result excludes the promotional banner and inventory summary. Selecting the numeric product-ID migration with the inspector’s string-ID dependency produces a recorded refusal before candidate mutation. Other hosted combinations are labelled unrecorded and direct the visitor to local mode.

## Architecture

```text
rendered selection
→ opaque receipt from current-session React instrumentation
→ server-resolved source identity
→ server-owned analyzed feature slice
→ canonical Integration Plan V2
→ server validation against current-session evidence and pinned Git commits
→ deterministic projection to the candidate generator
→ verification
→ real candidate-worktree preview or refusal
```

Core packages cover repository/worktree control, preview runtime, source instrumentation, source analysis, candidate generation, and shared bridge contracts. The hosted sample is a presentation layer; it does not replace or weaken these local packages.

## Reproducible evaluation

```sh
npm run typecheck
npm test
npm run test:studio
npm run test:source-analysis
npm run test:feature-slice
npm run test:candidate-generation
npm run test:candidate-integration
npm run fixture:verify
npm run test:e2e
npm run build
```

Engineering records: [Architecture decisions](docs/adr/) · [Evaluation](docs/evaluation.md) · [Limitations](docs/limitations.md) · [Risk register](docs/risk-register.md)

## Limitations

Current execution is bounded to local React + TypeScript + Vite repositories using npm. Although some earlier documentation named pnpm and yarn, preview dependency preparation and default candidate verification currently invoke npm; pnpm/yarn execution is not proven. Next.js, arbitrary monorepos, cloud repository execution, GitHub authentication, collaboration, and guaranteed integration of arbitrary branch combinations are not supported.

UI Merge Studio assumes the local developer and local browser/processes are trusted. Selection receipts establish normal-flow and current-session provenance and keep browser-authored source metadata from becoming generation authority; they are not tamper-proof proof of a physical UI click. Deliberate bypass through DevTools, transformed-module inspection, or direct localhost requests is outside the Phase-0 threat model.

The FlowCraft evaluation target uses Next.js 14 and remains outside the current Vite adapter. A second unrelated Vite repository with application-owned tests remains the next external compatibility milestone.

## License

MIT
