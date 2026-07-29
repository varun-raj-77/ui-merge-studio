# UI Merge Studio

**Visually select preferred features from multiple running React branches and create one verified combined branch.**

UI Merge Studio is a local developer tool for React + TypeScript + Vite repositories. It launches branches in isolated worktrees, keeps their live applications comparable, maps rendered selections to source declarations and dependencies, generates a candidate from the exact common base, and runs verification.

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
- Deterministic candidate generation from the common base.
- TypeScript, test, build, and runtime verification.
- Refusal before mutation for unsupported or conflicting slices.
- Bounded external Vite candidate generation on one unrelated repository.

The external proof generated a six-file candidate from base `8223897`, preserved both source branches, passed install, TypeScript, lint, build, and runtime verification, and reproduced the same candidate tree. This is evidence for one conventional Vite repository—not universal React support.

## Product Catalogue sample

The baseline is a stable product grid. Branch A adds a collapsible, filtering category sidebar plus an unrelated promotional change. Branch B adds an accessible product quick-view inspector plus unrelated newest-first sorting.

The recorded supported pair is:

- Collapsible category sidebar — Branch A
- Product quick-view inspector — Branch B

The combined result excludes the promotional banner and newest-first sorting. Selecting the promotion’s numeric product-ID migration with the inspector’s string-ID dependency produces a recorded refusal before candidate mutation. Other hosted combinations are labelled unrecorded and direct the visitor to local mode.

## Architecture

```text
rendered selection
→ instrumented React identity
→ source declaration
→ Git diff from common base
→ dependency slice
→ deterministic candidate plan
→ verification
→ combined preview or refusal
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

Current support is bounded to local React + TypeScript + Vite repositories using npm, pnpm, or yarn. Next.js, arbitrary monorepos, cloud repository execution, GitHub authentication, collaboration, and guaranteed integration of arbitrary branch combinations are not supported.

The FlowCraft evaluation target uses Next.js 14 and remains outside the current Vite adapter. A second unrelated Vite repository with application-owned tests remains the next external compatibility milestone.

## License

MIT
