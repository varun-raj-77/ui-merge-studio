# Prompt 006 UX evaluation

## Method

The evaluator used a fresh 1440×900 Chromium page, then repeated responsive inspection at 1280×720, 1440×900, and 1920×1080. The walkthrough was performed from visible product cues only. DevTools was not used to complete the task. Source-file or engine terminology was not verbally explained.

## Five-second comprehension

The initial view states:

- product: UI Merge Studio;
- fixture: Sample Support Dashboard;
- task: choose one useful change from each version and create a verified result;
- versions: Collapsible Sidebar Variant and Activity Filters Variant;
- workflow: Compare, Select, Combine, Verify;
- next action: Load both versions.

The first viewport contains those elements together. Guided Mode contains none of the prohibited technical phrases. The fixture’s internal “Beacon Ops” brand remains visible only inside the running sample and is contextualized by the surrounding Sample Support Dashboard description.

## Walkthrough

1. Load both versions.
2. Choose the sidebar control in Version A; the Studio automatically produces “Collapsible Sidebar.”
3. Choose the note filter in Version B; the Studio automatically produces “Activity Filters.”
4. Read the persistent safety status and create the combined branch.
5. Inspect verification or open the verified result.

No document scroll is required at 1440×900 for the selected-feature/combine state. Each embedded preview has its own bounded scroll area. The persistent tray remains visible.

The shortest guided path takes six primary activations to create the verified branch: load, enter and complete Version A selection, enter and complete Version B selection, and create. Opening the verified result is a seventh activation.

## Keyboard and accessibility observations

The product controls are native buttons/selects with visible focus. Enter activates selection mode. A keyboard-activated preview control produces the same validated selection. The technical drawer receives focus on its close button and closes with Escape. Status changes use live regions. Automated checks found one H1, no visible unnamed buttons, no unnamed iframes, no duplicate IDs, and no outer-page horizontal overflow at the tested widths.

## Remaining UX caveats

- The controlled fixture still displays “Beacon Ops” internally.
- Advanced arbitrary branch choices retain the scenario card narrative.
- Choosing a feature happens inside an iframe, so assistive technology traverses a document boundary.
- The success summary is intentionally concise; full changed-file and verification evidence remains secondary.
# Prompt 006C shell evaluation

The controlled product proof now uses a distinctive ink/ivory/orange system, a generic product-first overview, honest sample limitations, resumable application navigation, branch-first comparison labels, compact live-app framing, explicit changed-region guidance, selection confirmation, and a live three-view result workspace. Technical evidence is contextual rather than globally dominant.

At 1280×720, 1440×900, and 1920×1080 the outer document and preview shells remain free of required horizontal dragging. The sticky state action remains reachable and the source applications occupy most of the comparison viewport.
