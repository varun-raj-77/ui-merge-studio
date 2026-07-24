# Codex Prompt 006D — Unify the Product Visual System and Simplify the Comparison Workspace

## Objective

Make UI Merge Studio feel like one cohesive flagship product.

The homepage already has the stronger visual identity:

- warm ivory background;
- bold ink-black typography;
- signal-orange accent;
- editorial clarity;
- confident product presentation.

The comparison workspace currently feels like a separate dark internal dashboard.

Unify both experiences under one product system while preserving all existing behavior.

This prompt must only improve:

- visual cohesion;
- comparison-page clarity;
- preview prominence;
- branch labeling;
- workspace density;
- responsive polish.

Do not rewrite the engine.

Do not change source mapping, analysis, generation, verification, refusal, worktree handling, polling, or cleanup unless required to fix a UI regression.

Do not start FlowCraft validation.

This is the final controlled-demo styling and information-density pass.

---

## Repository Context

Repository:

C:\Users\rekha\OneDrive\Documents\UI merge studio

Starting branch:

codex/phase0-guided-product-experience

Expected latest commits:

1cd93f4 feat: complete controlled product shell
915017d docs: record prompt 006c product pass

Preserve all Prompt 001–006C functionality:

- homepage and resumable demo;
- Back to overview navigation;
- clickable product identity;
- live branch previews;
- Side by side / Focus navigation / Focus activity;
- synchronized route and fixture state;
- changed-region guidance;
- selection confirmation;
- broad-selection refusal;
- deterministic analysis;
- candidate generation;
- verification;
- final combined-result workspace;
- technical evidence;
- cleanup and source-branch safety.

---

# Current UX Problem

The homepage and comparison workspace look like two different products.

## Homepage

Current strengths:

- warm ivory background;
- bold black hierarchy;
- orange accent;
- memorable identity;
- strong first impression;
- understandable product explanation.

## Comparison workspace

Current weaknesses:

- fully dark shell;
- dense developer-dashboard appearance;
- many borders and stacked controls;
- smaller, heavier information hierarchy;
- lingering generic “Version A / Version B” language;
- branch dropdowns imply configurability that does not exist in the guided demo;
- live previews do not dominate enough;
- too much text appears before the previews;
- orange feels like an operational status color instead of the product accent.

The transition currently feels like:

marketing homepage
→ unrelated internal admin console

Required feeling:

one product
→ deeper working environment

---

# Visual Source of Truth

Use the homepage as the visual source of truth.

Required design tokens:

- Ink: `#111315`
- Warm ivory: `#F5F2EB`
- White: `#FFFFFF`
- Soft stone: `#D9D4CA`
- Light stone: `#ECE8DF`
- Graphite: `#686C70`
- Signal orange: `#FF6B3D`
- Dark orange hover: `#E9562F`
- Success green: use a restrained accessible green
- Failure red: use a restrained accessible red

Encode these as reusable CSS custom properties.

Do not scatter raw colors throughout components.

---

# Required Workspace Direction

The comparison workspace must use:

- warm ivory outer background;
- compact ink-black product header;
- white or soft-stone preview surfaces;
- signal-orange active and selected states;
- dark technical-evidence drawer;
- restrained green success;
- restrained red failure.

The live applications inside the previews may retain their own application colors.

The outer UI Merge Studio shell must remain visually consistent with the homepage.

Do not make the entire comparison page dark.

---

# Header

Create one compact product header.

Required elements:

Left:

- Back to overview
- UI Merge Studio product identity

Center or nearby:

- Compare
- Select
- Combine
- Verify

Right:

- Preview layout controls
- small contextual help or overflow action

Do not place a dominant Technical Details button in the header.

Technical evidence must remain contextual.

Reduce header height.

Avoid large empty vertical spacing.

---

# Simplify the Top Explanation

Replace the current multi-line introduction with:

## Compare branches

“These are two live Git branches of the same React application. Select one branch-specific UI change from each.”

Secondary contextual links:

- What am I seeing?
- How are changes identified?

Do not repeat:

- long sample explanations;
- base-branch explanations;
- fixture descriptions;
- synchronization details;

inside the primary workspace.

Those details already exist on the homepage or in contextual help.

---

# Branch Panels

Use meaningful experiment names as the primary labels.

## Left panel

Navigation experiment

Secondary metadata:

`branch-sidebar`

Description:

“Live app containing a navigation change and other branch edits.”

## Right panel

Activity-filter experiment

Secondary metadata:

`branch-inspector`

Description:

“Live app containing an activity-filter change and other branch edits.”

Remove “Version A” and “Version B” from all primary Guided Mode surfaces.

Search the entire Guided Mode UI for lingering Version A / Version B language, including:

- sticky tray;
- loading states;
- selection summaries;
- error states;
- result summaries.

Replace with:

- Navigation branch
- Activity-filter branch
- Source branch
- Combined result

Technical evidence may retain slot identifiers where operationally necessary.

---

# Remove Misleading Dropdowns

The guided demo uses fixed source branches.

The current branch dropdowns imply the user can meaningfully switch sources.

Replace them with read-only branch identity blocks.

Example:

Navigation experiment
`branch-sidebar`

Activity-filter experiment
`branch-inspector`

Keep:

- Restart live app

Remove:

- branch dropdown control

Do not allow `main`, `combined-result`, or incompatible fixture branches to appear as selectable sources in Guided Mode.

Branch configurability belongs to the future real-repository setup flow, not this demo.

---

# Preview-First Layout

The live previews must dominate the workspace.

Reduce:

- preview-card header height;
- branch-description height;
- duplicate state messages;
- redundant labels;
- borders and nested boxes;
- empty space above previews.

At 1440×900:

- the previews should occupy most of the viewport;
- the selection tray should remain visible;
- the user should not repeatedly scroll the document;
- no outer horizontal scrolling;
- no required horizontal dragging inside the previews.

Keep:

- Side by side
- Focus navigation
- Focus activity

Use concise labels:

- Side by side
- Focus navigation
- Focus activity

Do not repeat “branch” in every control unless needed for clarity.

---

# Preview Card Structure

Each preview card should contain only:

1. Experiment name
2. Raw branch name as secondary metadata
3. Live status
4. Restart action
5. Selection summary
6. Live preview

Remove unnecessary labels such as:

- LIVE APP FROM THIS BRANCH
- BRANCH
- experiment source
- synchronized sample route

unless they materially help.

A small status line is enough:

“Live and synchronized”

Keep technical session, port, generation, route protocol, and worktree details in Technical Evidence only.

---

# Selection Summary

Use a compact, clear block.

Before selection:

## Select a branch-specific change

Navigation panel:

“Choose the collapsible navigation change.”

Activity panel:

“Choose the activity-filter controls.”

Primary action:

Choose feature

After selection:

Selected:
Collapsible navigation

or:

Selected:
Activity filters

Secondary actions:

- Change
- View source evidence

Do not render large explanatory panels.

---

# Persistent Tray

Use the same visual language as the homepage.

Warm or white surface.

Ink text.

Orange accent only for the primary action and active state.

The tray should show:

Navigation branch:
No feature selected / selected feature

Activity-filter branch:
No feature selected / selected feature

Safety check:
Current state

Primary action:
state-specific action

Remove any remaining:

- Version A
- Version B
- raw operation language;
- low-level verification commands.

Keep it compact enough not to obscure the previews.

---

# State-Specific Visual Treatment

## Waiting

Neutral stone treatment.

## Analyzing

Orange progress indicator.

## Ready

Subtle green status with orange primary action.

## Refused

Restrained red status.

## Failure

Clear red status and readable next action.

## Success

Subtle green verification state with orange “Open combined result” action.

Do not use orange as an error color.

Do not rely on color alone.

---

# Homepage Diagram Polish

Keep the branch relationship diagram.

Improve:

- connector alignment;
- spacing;
- visual weight;
- box consistency;
- arrow/flow clarity.

It should clearly communicate:

main
→ two experiment branches
→ verified combined result

Do not redesign the entire homepage.

Only polish the diagram so it matches the quality of the hero section.

---

# Combined Result Workspace

Preserve the existing real combined-result view.

Apply the same visual system:

- warm ivory shell;
- clear source/result tabs;
- white preview surface;
- orange active tab;
- concise verification summary;
- dark technical drawer.

The user must clearly distinguish:

- Navigation source
- Activity-filter source
- Combined result

Do not call them Version A / Version B.

The combined result must remain visually central after success.

---

# Technical Evidence

Keep the technical drawer dark.

This provides purposeful contrast:

- Guided Mode: warm, clear, product-facing
- Technical Evidence: dark, dense, engineering-facing

Do not change its content unless required for color-token consistency or accessibility.

Access technical evidence only through contextual links such as:

- View source evidence
- View safety evidence
- View failure details
- View verification evidence

No dominant global Technical Details button.

---

# Typography

Use a consistent modern sans-serif system throughout both pages.

Do not introduce a new external font dependency unless the project already has one.

Use system or existing fonts.

Required hierarchy:

- strong product title;
- compact page title;
- clear experiment names;
- restrained labels;
- readable body text;
- monospace only for branch names, files, hashes, and commands.

Do not use oversized serif headings.

---

# Accessibility

Preserve or improve:

- contrast;
- keyboard navigation;
- focus-visible states;
- screen-reader labels;
- non-color-only status;
- responsive behavior;
- reduced-motion preferences.

Check signal orange buttons for accessible text contrast.

Do not sacrifice usability for appearance.

---

# Implementation Efficiency

Conserve Codex usage.

Required process:

1. Inspect current App and CSS structure.
2. Identify existing design tokens and duplicate colors.
3. Form one concise internal implementation plan.
4. Implement directly.
5. Reuse current components.
6. Do not change engine packages.
7. Do not perform unrelated refactors.
8. Run focused Studio tests during development.
9. Run one final responsive browser pass.
10. Run final regressions once.
11. Produce a concise report.

Do not create mockups.

Do not repeatedly run full Playwright.

Do not generate a large documentation package.

---

# Required Tests

Update only tests affected by this pass.

## Visual token test

Verify:

- workspace uses the same token system as the homepage;
- blue/purple is not the dominant Guided Mode accent;
- signal orange is used for primary interactions.

## Navigation and labels

Verify:

- no primary Version A / Version B labels remain;
- branch dropdowns are removed from Guided Mode;
- branch names remain visible as secondary metadata.

## Layout

At:

- 1280×720
- 1440×900
- 1920×1080

Verify:

- no outer horizontal overflow;
- previews dominate the workspace;
- persistent tray remains reachable;
- no required horizontal dragging;
- focus modes still work.

## Existing journeys

Preserve:

- homepage;
- resume demo;
- back to overview;
- changed-region selection;
- broad unsafe selection refusal;
- candidate generation;
- final combined-result view;
- technical evidence;
- cleanup.

---

# Required Final Commands

Inspect package.json and use actual scripts.

At minimum run:

npm run typecheck
npm test
npm run test:studio
npm run build
npm run fixture:verify

Run focused Playwright coverage for:

- homepage;
- comparison workspace;
- responsive overflow;
- selection;
- candidate generation;
- combined-result view.

Do not run unrelated expensive suites repeatedly.

Report any timeout honestly.

---

# Documentation

Update only:

- docs/ux-evaluation.md
- docs/evaluation.md
- docs/decision-log.md
- docs/limitations.md

Create:

- docs/codex-prompts/006d-visual-system-unification.md
- docs/completion-report-006d.md

Store this prompt exactly.

Do not rewrite the README unless screenshots or palette references require a small correction.

---

# Acceptance Criteria

PASS requires:

1. Homepage and workspace clearly look like the same product.
2. Warm ivory, ink, and signal orange define the Guided Mode system.
3. Comparison workspace is no longer a fully dark dashboard.
4. Live previews dominate the page.
5. Top explanation is concise.
6. Branch panels are substantially simpler.
7. Branch dropdowns are removed from Guided Mode.
8. Raw branch names remain visible as secondary metadata.
9. Version A / Version B language is removed from primary Guided Mode surfaces.
10. Persistent tray matches the homepage visual language.
11. Technical Evidence remains intentionally dark and secondary.
12. Homepage branch diagram looks polished and intentional.
13. Combined-result workspace uses the same visual system.
14. No horizontal dragging is required.
15. Existing behavior and safety remain unchanged.
16. The final screenshots look like one cohesive flagship product.

---

# Failure Criteria

Return MODIFY if:

- the change is only a few color replacements;
- the workspace remains visually unrelated to the homepage;
- the entire comparison workspace remains dark;
- branch dropdowns remain;
- Version A / Version B still appear prominently;
- previews remain crowded by controls;
- text density remains unchanged;
- technical evidence becomes harder to access;
- engine behavior changes unnecessarily;
- accessibility regresses;
- responsive layout breaks;
- cleanup or source safety regresses.

---

# Required Completion Report

Keep the report concise.

Report:

1. Starting commit.
2. Design-token changes.
3. Workspace color changes.
4. Header simplification.
5. Branch-panel simplification.
6. Dropdown removal.
7. Version-label cleanup.
8. Preview-layout changes.
9. Tray changes.
10. Diagram polish.
11. Combined-result visual changes.
12. Files changed.
13. Tests changed.
14. Exact commands run.
15. Test/build results.
16. Responsive screenshots:
    - homepage;
    - side-by-side comparison;
    - focused comparison;
    - selected features;
    - combined result.
17. Remaining limitations.
18. PASS, MODIFY, or ABANDON.

Perform one fresh manual walkthrough before recommending PASS.
