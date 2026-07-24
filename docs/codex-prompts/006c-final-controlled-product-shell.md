# Codex Prompt 006C — Final Product Shell, Comparison Clarity, and Visual Result

## Objective

Complete the final controlled Phase 0 product-experience pass for UI Merge Studio.

The product must feel like a real, polished developer tool rather than a fixture experiment or an internal debugging interface.

The user must understand, without external coaching:

1. What UI Merge Studio does.
2. That the sample is only a demonstration.
3. Why two branches of the same React application are being shown.
4. That each panel is a complete, live application running from a different Git branch.
5. That the user is selecting visible branch-specific changes.
6. That the visual selection directly determines which source code may enter the combined branch.
7. What will happen after selection.
8. What the generated result contains.
9. That original branches remain unchanged.
10. How to return to the product homepage.

This prompt is intentionally narrow to conserve implementation time and Codex usage.

Do not rewrite the engine.

Do not begin FlowCraft validation.

Do not add arbitrary-repository execution yet.

Preserve all working Prompt 001–006B behavior.

---

## Repository Context

Repository:

C:\Users\rekha\OneDrive\Documents\UI merge studio

Starting branch:

codex/phase0-guided-product-experience

Expected latest commits:

a6e0a26 feat: finish guided product experience
4eac2df docs: record prompt 006b correction

The repository already contains:

- isolated Git worktrees;
- asynchronous preview operations;
- synchronized live previews;
- rendered React element-to-source mapping;
- dependency-aware feature analysis;
- deterministic candidate planning;
- AST-aware branch generation;
- TypeScript, tests, and build verification;
- rollback and refusal;
- candidate launch;
- progressive technical evidence;
- guided sample experience;
- responsive Both / Focus A / Focus B modes;
- broad-selection blocking;
- plain-language failures.

Preserve these systems.

---

# Product Positioning

The source-of-truth sentence is:

“Run multiple React branches, visually select the UI changes you want, and create one verified combined branch.”

UI Merge Studio is:

- a visual decision layer;
- a source-grounded integration system;
- a verification layer for parallel React implementations.

It is not:

- a sidebar tool;
- a support-ticket tool;
- a generic coding agent;
- an AI prompt wrapper;
- a screenshot comparison service;
- a generic Git client.

The sample navigation and activity filters are only controlled demonstration features.

The visual comparison must remain causally connected to source integration.

Every generated source change must be traceable to:

- a confirmed visual selection; or
- a required supporting dependency of that selection.

---

# Part 1 — Refine the Product Homepage

Keep the current homepage structure if it is already working, but improve its visual identity, wording, and action hierarchy.

The homepage must contain:

## Product identity

UI Merge Studio

## Primary statement

“Combine the best UI changes from different React branches.”

## Supporting explanation

“Run branches as real interactive applications, click the visible changes you want, and create one tested combined Git branch.”

## Primary action

“Try sample demo”

## Secondary action

“How it works”

Do not use:

- “Version A”
- “Version B”
- fixture branch names;
- source-mapping jargon;
- feature-slice terminology;
- technical hashes.

## Honest product status

Near the sample action, make clear:

“This guided demo uses a small local React project. Support for selecting arbitrary local repositories is the next validation milestone.”

Do not create a fake local-repository workflow.

Do not imply arbitrary repository support already exists.

---

# Part 2 — New Visual Identity

Replace the generic blue AI-tool styling.

Use this palette:

- Ink: `#111315`
- Warm ivory: `#F5F2EB`
- Signal orange: `#FF6B3D`
- Soft stone: `#D9D4CA`
- Graphite: `#686C70`
- White: `#FFFFFF`

The palette should be encoded through reusable CSS design tokens.

Signal orange should be used intentionally for:

- primary actions;
- selected feature outlines;
- active workflow stage;
- key progress indicators;
- important but non-dangerous attention states.

Do not cover the interface in orange.

Use red only for failure and refusal.

Use green only for verified success.

## Visual direction

Aim for:

- modern sans-serif typography;
- strong but compact headings;
- restrained surfaces;
- crisp contrast;
- fewer nested cards;
- fewer visible borders;
- generous but controlled spacing;
- subtle shadows;
- confident primary buttons;
- polished focus and hover states;
- small purposeful transitions.

Avoid:

- blue/purple AI gradients;
- giant serif headlines;
- generic SaaS card grids;
- beige dashboard styling;
- excessive rounded boxes;
- empty decorative space;
- neon cyberpunk effects.

The product should look distinctive in screenshots and video while remaining serious and simple.

Do not add a large UI framework.

---

# Part 3 — Clear Navigation

The comparison workspace must have an obvious application-level navigation control.

Add:

“← Back to overview”

in the top-left.

Also make the “UI Merge Studio” product name clickable.

Both actions must return to the homepage through application state, not require the browser Back button.

The user must never need to press the browser Back button twice.

Returning home should:

- preserve the comparison state while the local server remains active;
- not silently create duplicate previews;
- allow the user to resume the demo;
- provide an explicit “Stop demo” action if previews should be destroyed.

Do not add a routing library unless the repository already uses one or it is clearly necessary.

Use the smallest reliable state/navigation implementation.

---

# Part 4 — Simplify the Comparison Workspace

The comparison page currently contains too much explanation at once.

Reduce visible copy and controls substantially.

The main workspace should contain only:

1. Compact product header.
2. Compact workflow stage.
3. One clear sentence explaining the comparison.
4. Two dominant live application previews.
5. One persistent selection/action tray.

## Required comparison explanation

Show this near the top:

“These are two Git branches of the same React application. Each panel is the complete live app running from that branch.”

A secondary sentence may say:

“Choose one branch-specific UI change from each.”

Do not repeat longer fixture explanations throughout the page.

Provide a small “What am I seeing?” link for additional explanation.

---

# Part 5 — Replace Version A and Version B

Do not use “Version A” and “Version B” as the primary labels.

Use:

## Left

Navigation experiment

Secondary metadata:

`branch-sidebar`

Short description:

“A branch containing a navigation change and other edits.”

## Right

Activity-filter experiment

Secondary metadata:

`branch-inspector`

Short description:

“A branch containing an activity-filter change and other edits.”

Also show:

“Both branches started from `main`.”

The raw branch names should be visibly secondary.

The user must understand that:

- these are branches;
- they are from the same application;
- they may contain multiple changes;
- the user is choosing only the visible changes they prefer.

---

# Part 6 — Explain What Is Displayed Visually

Each preview header must include a concise label:

“Live app from this branch”

The preview is:

- not a screenshot;
- not a mockup;
- not only the changed code;
- the full interactive application running from that Git branch.

Add a small contextual help action:

“What am I seeing?”

Its content should explain:

- both panels are real running apps;
- they are built from separate Git worktrees;
- the same route and sample data are synchronized;
- branch-specific changed regions become selectable;
- a visual selection maps back to React source.

Keep this explanation short enough to read in under 30 seconds.

---

# Part 7 — Emphasize the Live Previews

The running applications must dominate the workspace.

Reduce:

- card header height;
- branch-description height;
- workflow explanation height;
- duplicate status copy.

Retain:

- Both;
- Focus left;
- Focus right.

Rename them more clearly if appropriate:

- Side by side;
- Focus navigation branch;
- Focus activity branch.

At 1440×900:

- both previews should be usable without outer horizontal scrolling;
- the persistent action tray should remain visible;
- the user should not need to repeatedly scroll the document;
- the live applications should occupy most of the available screen.

At 1280×720:

- focused view or tabs are acceptable;
- switching must be obvious;
- selection state must remain visible.

Do not reintroduce draggable horizontal scrollbar dependence.

---

# Part 8 — Changed-Region Discovery

The user must not click randomly.

Before or during selection mode, show a concise explanation:

“Highlighted areas are branch-specific UI changes that UI Merge Studio can trace to source.”

Use real mapping and Git-change evidence.

Classify regions as:

- Recommended change
- Changed but broader
- Unchanged
- Unsupported
- Ambiguous

Only supported changed regions should receive the primary selectable treatment.

Unchanged regions should not appear equally selectable.

For the sample, presentation metadata may label the expected demonstrations:

- Collapsible navigation
- Activity filters

The labels must not control source analysis or generation.

Do not hard-code DOM coordinates.

Do not hard-code merge behavior using fixture component names.

---

# Part 9 — Selection Explanation

After a valid selection, show only a compact user-facing summary:

Selected:

Collapsible navigation

From:

Navigation experiment

Includes:

- the selected UI behavior;
- required supporting code;
- related tests and styles.

Does not include:

- unrelated changes from that branch.

Provide:

- Confirm selection
- Choose another
- View source evidence

Do not expose dependency lists, source identities, operation IDs, hashes, or test units in the default workspace.

Those remain in contextual technical evidence.

---

# Part 10 — Persistent Action Tray

The sticky tray must show:

- selected feature from the left branch;
- selected feature from the right branch;
- current safety state;
- exact next action.

Possible states:

## No selections

“Select one branch-specific change from each live app.”

## Analyzing

“Checking source code and required dependencies.”

## Not safe

“This selection cannot be combined safely.”

## Ready

“Both selections passed the compatibility check.”

Primary action:

“Create verified branch”

## Generating

“Creating and testing the combined branch.”

## Failure

“Review failure”

## Success

“Open combined result”

The primary action must always match the state.

---

# Part 11 — Final Visual Result

After successful generation, the running combined application must be visually central.

Add a result workspace containing:

- Navigation experiment
- Activity-filter experiment
- Combined result

Do not force three narrow panes simultaneously if that damages usability.

A good implementation may use:

- three tabs;
- source/result toggle;
- two-source comparison followed by a large result pane;
- focus mode for each source and result.

Required behavior:

1. The combined app launches as a real running application.
2. The user can interact with it.
3. The result clearly identifies the output branch:
   `combined-result`.
4. The user can return to either source branch for comparison.
5. The user can visually confirm that the two selected features coexist.
6. The user can inspect which unrelated changes were excluded.

Show a concise result summary:

Verified branch created

`combined-result`

Included:

- Collapsible navigation
- Activity filters

Excluded:

- unrelated heading change
- unrelated sorting change

Verification:

- TypeScript passed
- feature tests passed
- full tests passed
- production build passed

Original branches changed:

No

Primary action:

“View combined app”

Secondary actions:

- Compare sources
- View changed files
- View verification evidence
- Copy branch name

---

# Part 12 — Technical Evidence Placement

Do not show a dominant global “Technical details” button in the main header.

Expose contextual secondary links:

- How was this change identified?
- View source evidence
- View compatibility plan
- View error details
- View verification evidence
- View Git details

Use the existing drawer or modal.

Do not remove technical evidence.

Do not require it for basic comprehension.

---

# Part 13 — AI Positioning

Do not add an LLM in this prompt.

The controlled merge path must remain deterministic.

The UI may explain:

“Visual selections are mapped to source using runtime instrumentation, Git history, static analysis, and verification.”

Do not claim:

- AI understands everything;
- arbitrary React branches always work;
- universal semantic merging;
- production readiness.

AI assistance remains a future optional layer for:

- feature naming;
- explanations;
- ambiguous selection help;
- manual conflict suggestions.

---

# Part 14 — Usage and Implementation Efficiency

Minimize Codex usage.

Required process:

1. Inspect current App, CSS, scenario metadata, navigation state, and relevant tests.
2. Form one concise implementation plan internally.
3. Implement directly.
4. Reuse existing components and state.
5. Avoid engine changes.
6. Avoid unrelated refactors.
7. Do not produce design mockups before coding.
8. Run focused component tests during development.
9. Run focused browser tests once near completion.
10. Run the final regression commands once.
11. Produce a concise report.

Do not repeatedly rerun the full browser suite.

Do not generate a massive documentation package.

Do not spend time re-benchmarking performance beyond confirming no regression.

---

# Required Tests

Add or update only tests necessary for this pass.

## Homepage

Verify:

- product purpose is generic;
- “Try sample demo” is the primary action;
- sample limitations are honest;
- blue styling is removed from the primary experience;
- the new visual tokens are applied.

## Navigation

Verify:

- Back to overview returns home;
- clicking UI Merge Studio returns home;
- comparison state does not duplicate previews;
- resume behavior is predictable.

## Comparison comprehension

Verify visible copy explains:

- same React application;
- two Git branches;
- full live apps;
- selection of branch-specific changes;
- new verified branch output.

## No vague primary labels

Verify “Version A” and “Version B” are not the main branch labels.

## Layout

At 1280×720, 1440×900, and 1920×1080:

- no outer horizontal overflow;
- no required horizontal scrollbar dragging;
- previews remain usable;
- persistent action remains reachable.

## Changed-region discoverability

Verify supported changed regions are distinguishable from unchanged regions.

## Guided selection

Verify the intended navigation and filter features can be selected without technical terminology.

## Final visual result

Verify:

- the real combined candidate launches;
- the result view is visible;
- the user can switch between source branches and result;
- both selected features work;
- unrelated changes are absent.

## Existing safety regressions

Preserve:

- broad-selection blocking;
- plain-language failure;
- post-failure action correctness;
- candidate verification;
- cleanup;
- source-ref immutability.

---

# Required Final Commands

Inspect package.json and use actual repository commands.

At minimum run once on final code:

npm run typecheck
npm test
npm run test:studio
npm run build
npm run fixture:verify

Run focused Playwright specs covering:

- homepage and navigation;
- comparison comprehension;
- responsive layout;
- selection;
- candidate generation;
- final visual result.

Do not rerun unrelated expensive suites unless a regression requires it.

Report any timeout or failure honestly.

---

# Documentation

Update only:

- README.md
- docs/demo-script.md
- docs/ux-evaluation.md
- docs/evaluation.md
- docs/decision-log.md
- docs/limitations.md

Create:

- docs/codex-prompts/006c-final-controlled-product-shell.md
- docs/completion-report-006c.md

Store this prompt exactly.

Keep the completion report concise.

---

# Acceptance Criteria

PASS requires:

1. The homepage looks distinctive, premium, simple, and memorable.
2. The blue AI-tool appearance is replaced with the ink/ivory/orange design system.
3. “Try sample demo” is the clear primary action.
4. The user understands that the sample is not the full product.
5. The comparison page clearly explains the two panels as Git branches of the same React app.
6. The user understands that each panel is a complete live application.
7. “Version A/B” are no longer the main labels.
8. Back to overview works.
9. Clicking UI Merge Studio returns home.
10. Browser Back is not required.
11. The comparison page contains substantially less visible text.
12. Live previews dominate the screen.
13. No horizontal dragging is required.
14. Branch-specific changed regions are visually discoverable.
15. The user does not click randomly.
16. The selected features remain causally connected to source integration.
17. Technical evidence remains optional.
18. State-specific primary actions remain correct.
19. The combined result is shown as a real live application.
20. The user can compare sources and final result visually.
21. Existing generation, refusal, verification, and cleanup guarantees remain intact.
22. No arbitrary-repository or AI capability is falsely implied.
23. A fresh manual user can explain the complete workflow after using it once.

---

# Failure Criteria

Return MODIFY if:

- the change is only recoloring;
- blue remains the dominant product accent;
- the comparison page remains text-heavy;
- the user still cannot explain why there are two branches;
- the user still cannot tell whether previews are screenshots or live apps;
- browser Back is still required;
- technical evidence remains visually dominant;
- horizontal dragging returns;
- changed regions remain undiscoverable;
- the final result is not visually shown;
- the engine is unnecessarily rewritten;
- performance, cleanup, or source safety regresses;
- arbitrary repository support is faked;
- the controlled demo still needs continuous verbal coaching.

---

# Required Completion Report

Report only:

1. Starting commit.
2. Homepage changes.
3. Color/design-system changes.
4. Comparison wording changes.
5. Navigation changes.
6. Layout changes.
7. Changed-region discovery changes.
8. Final visual-result implementation.
9. Files changed.
10. Tests changed.
11. Exact commands.
12. Test and build results.
13. Cleanup and source-ref audit.
14. Screenshots:
    - homepage;
    - comparison;
    - selection;
    - result;
    - 1280×720;
    - 1440×900;
    - 1920×1080.
15. Remaining limitations.
16. PASS, MODIFY, or ABANDON.

Perform one fresh manual walkthrough without DevTools before recommending PASS.
