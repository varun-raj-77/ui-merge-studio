# Codex Prompt 006 — Rebuild UI Merge Studio into a Five-Second, High-Trust Product Experience

## Objective

Transform UI Merge Studio from an internal research/debugging console into a polished, understandable, high-trust developer product.

A first-time user must understand the product within five seconds:

“Compare two React versions, click the features you prefer, and create one verified combined branch.”

The controlled Phase 0 workflow must be completable without the user needing to understand internal concepts such as:

- React component boundaries
- source identities
- ancestor promotion
- feature slices
- dependency graphs
- AST operations
- schema versions
- provenance
- Git tree hashes
- worktree topology
- test-unit extraction

The existing deterministic engine has already been proven in Prompt 005. Do not replace it, bypass it, mock it, or weaken it.

This prompt is a complete product-experience overhaul, not a visual styling pass.

The result must be:

- immediately understandable;
- easy to operate;
- fast to respond;
- honest about progress;
- clear when refusing unsafe combinations;
- detailed when advanced evidence is requested;
- demonstrable to recruiters without verbal coaching.

Source-of-truth sentence:

“Visually select preferred features from multiple running React branches and create one verified combined branch.”

Every screen, label, interaction, and technical decision must support that sentence.

---

# Repository Context

Repository:

C:\Users\rekha\OneDrive\Documents\UI merge studio

Starting branch:

codex/phase0-candidate-generation

Expected recent commits:

576b68c docs: record deterministic candidate-generation pass
68776fd feat: generate verified deterministic candidates

Prompt 005 already proved, on the controlled fixture:

- isolated Git worktrees;
- automatic branch preview startup;
- side-by-side React applications;
- route and fixture synchronization;
- rendered element-to-source mapping;
- meaningful ancestor selection;
- schema-v2 deterministic feature analysis;
- dependency extraction;
- exclusion of unrelated changes;
- plan-before-mutation candidate generation;
- AST-aware source reconstruction;
- import and export reconciliation;
- test reconstruction;
- candidate verification;
- deterministic repeated generation;
- atomic rollback;
- explicit refusal;
- candidate launch;
- machine-readable reports.

Preserve these capabilities.

Do not start FlowCraft validation in this prompt.

The goal is to make the existing controlled proof understandable, usable, fast, and demo-ready before validating another repository.

---

# Manual UX Failure Report

The current interface failed a real first-time manual evaluation.

Treat every item below as a product defect.

## Zero product clarity

The page does not immediately explain:

- what UI Merge Studio does;
- what the two applications represent;
- why the user should click anything;
- what result will be created;
- what the current step is.

A user must currently rely on external coaching.

## Confusing fixture

The sample application displays:

- “Beacon Ops”;
- Tickets;
- Customers;
- Reports;
- ticket IDs such as TCK-102.

Nothing explains:

- what Beacon Ops is;
- where the tickets came from;
- why a ticketing application is being shown;
- which differences the user is supposed to compare;
- that this is only a controlled sample repository.

The fixture currently looks like an unexplained third-party product rather than a deliberate UI Merge Studio demonstration.

## Internal terminology dominates the interface

The default experience exposes terms such as:

- Hovered boundary
- Selected boundary
- Eligible ancestors
- Feature slice
- Merge base
- Branch commit
- Included changes
- Excluded branch changes
- Unresolved dependencies
- Test-file slices
- Required import specifiers
- Schema-v2
- Definition boundary
- Runtime instance
- Proven-unrelated

These are implementation concepts, not user-facing product concepts.

## Selection is confusing

Clicking a visible feature may select an implementation-level child such as:

- SidebarNavItem
- TicketListItem
- another deeply nested component

The user must then:

- inspect “Hovered boundary”;
- inspect “Selected boundary”;
- understand React ancestry;
- find “Eligible ancestors”;
- manually promote the selection to AppSidebar or ActivityFilters.

This is unacceptable for the default experience.

## Excessive scrolling

The user must repeatedly:

- scroll to a preview;
- click something;
- scroll to mapping information;
- scroll to analysis controls;
- scroll to a feature-slice report;
- scroll to the second preview;
- scroll to candidate generation;
- scroll again to inspect results.

The happy path does not feel like one coherent workflow.

## Excessive blocks and panels

Every click creates large diagnostic blocks.

The page shows too many simultaneously visible concepts:

- preview metadata;
- hover data;
- selection data;
- ancestor data;
- feature analysis;
- dependencies;
- tests;
- import specifiers;
- excluded changes;
- candidate generation;
- preflight;
- report output.

The current page behaves like a compiler/debugging console.

## Candidate planning is unclear

“Prepare candidate plan” does not display a readable plan in the UI.

The user sees only a summary such as:

“23 operations across 16 files.”

Detailed information exists only in the API response or browser Network panel.

A user must never need DevTools to understand what the product is about to change.

## Preview startup is extremely slow

During manual testing, launching the two small fixture branches took approximately three minutes.

This is too slow for a controlled Vite fixture.

The UI provided weak progress explanation during the delay.

## API requests remain pending too long

Browser inspection showed preview-related API requests such as:

- /api/previews/left
- /api/previews/right

remaining pending for approximately one to two minutes.

The browser accumulated repeated preview status requests during startup.

Treat this as a concrete API and orchestration defect, not merely a loading-animation problem.

## Weak loading feedback

The user cannot clearly tell whether the system is:

- creating a worktree;
- installing dependencies;
- starting Vite;
- waiting for readiness;
- synchronizing previews;
- stalled;
- retrying;
- failing.

## Poor demo readiness

The current experience cannot be shown to a recruiter without continuously explaining:

- what Beacon Ops is;
- what a boundary is;
- what a feature slice is;
- why an ancestor must be selected;
- why the user must scroll;
- what candidate preflight means;
- where plan details are hidden.

The backend is technically impressive.

The product experience currently hides that value.

---

# Primary Product Requirement

The default experience must communicate this flow immediately:

Compare → Select → Combine → Verify

At a standard desktop viewport, the user must see:

1. What the product does.
2. Which two versions are being compared.
3. What they should do next.
4. Which feature has been selected from each version.
5. Whether the selections can be combined safely.
6. One primary action to create the combined branch.
7. Clear progress and verification results.

The user must not need to understand internal engine terminology to complete the workflow.

Technical evidence must remain available through progressive disclosure.

Do not simplify by deleting evidence.

Simplify by changing when and where evidence is shown.

---

# Experience Architecture

Implement two explicit experience levels.

## 1. Guided Mode

Guided Mode is the default.

It is designed for:

- first-time users;
- recruiters;
- demo viewers;
- developers performing the normal workflow.

Guided Mode should use product language such as:

- Version A
- Version B
- Select a feature
- Selected feature
- Ready to combine
- Cannot combine safely
- Create combined branch
- Verifying result
- Branch ready
- Open combined app
- View technical details

Guided Mode must not show internal engineering terminology by default.

## 2. Technical Details

Provide a secondary technical experience through a drawer, modal, side panel, or dedicated route.

Technical Details may expose:

- raw branch references;
- source files and line numbers;
- mapping identities;
- source declarations;
- supporting components;
- hooks;
- state;
- types;
- styles;
- assets;
- tests;
- exclusions;
- unresolved dependencies;
- exact merge base;
- source commits;
- AST operations;
- import/export reconciliation;
- operation IDs;
- verification commands;
- changed-file audit;
- Git commit and tree hashes;
- cleanup status;
- machine-readable reports.

Technical Details must be comprehensive, but it must not dominate Guided Mode.

---

# Required Guided Workflow

## Step 1 — Compare

The first viewport should contain:

UI Merge Studio

“Compare React versions, select the features you prefer, and create one verified combined branch.”

Show a compact workflow indicator:

1. Compare
2. Select
3. Combine
4. Verify

Show the two running applications side by side.

Use human-readable labels as the primary headings.

Example:

Version A
Collapsible Sidebar Variant

Version B
Activity Filters Variant

Raw Git branch names may appear as secondary metadata or inside Technical Details.

Do not make `branch-sidebar` and `branch-inspector` the first thing users must interpret.

---

## Step 2 — Select

Selection must happen directly inside each preview.

When hovering a selectable area:

- show a lightweight outline;
- show a concise readable feature label;
- do not create a large external hover panel;
- do not obscure the application;
- do not show hashes, sessions, source identities, or runtime IDs.

When clicked:

- lock the selection;
- show a compact confirmation;
- update a persistent selected-features tray;
- offer Change and Remove actions.

Example:

Selected from Version A:
Collapsible Sidebar

Selected from Version B:
Activity Filters

The user should not need to scroll below the preview to confirm the selection.

---

# Meaningful Automatic Selection

Implement a generic deterministic strategy that chooses the meaningful feature level.

Clicking a nested implementation component should not force the user to understand React ancestry.

Example:

The user clicks the Tickets navigation item inside the sidebar.

Current behavior:

Selected: SidebarNavItem

Required Guided Mode behavior:

Selected: Collapsible Sidebar

The system must use deterministic source and branch-change evidence to prefer a meaningful changed ancestor where appropriate.

Do not hard-code:

- AppSidebar;
- ActivityFilters;
- SidebarNavItem;
- TicketListItem;
- ticket IDs;
- source paths;
- fixture test names;
- expected file lists.

A possible generic scoring model may consider:

- whether the component changed on the branch;
- whether it owns the clicked visual region;
- whether it represents a larger contiguous feature;
- whether it has supporting changed dependencies;
- whether it is merely a repeated leaf;
- whether its nearest changed ancestor provides a more meaningful selection;
- whether selection analysis succeeds from that level;
- whether the candidate is within a reasonable ancestry distance.

The final strategy must be deterministic and tested.

When one candidate is clearly strongest, select it automatically.

When multiple meaningful levels are plausible:

- select the strongest deterministic default;
- provide a compact “Choose a different level” action;
- use readable presentation labels;
- place raw component names in secondary text.

Do not show “Eligible ancestors” in Guided Mode.

---

# Human-Readable Feature Labels

Create a presentation-label system that can turn internal source identities into useful feature names.

For the controlled demo, presentation metadata may supply labels such as:

- Collapsible Sidebar
- Activity Filters

This metadata must only affect presentation.

It must never instruct the candidate generator which files, symbols, or changes to merge.

The engine must continue using real source identities and dependency evidence.

When no configured label exists, derive a readable fallback from the component identity.

Examples:

`AppSidebar` → `App Sidebar`
`ActivityFilters` → `Activity Filters`

Do not display camel-cased internal names without formatting when a readable label can be produced safely.

---

# Step 3 — Analyze and Combine

The user should not need to separately understand or trigger:

- Analyze feature slice
- Prepare candidate plan
- Generate candidate

Replace the three-step internal workflow with one guided primary action:

Create combined branch

Before enabling this action, the product may automatically:

1. validate both selections;
2. analyze supporting code;
3. determine compatibility;
4. prepare the deterministic candidate plan.

Show understandable progress:

- Understanding the Sidebar feature
- Finding supporting code
- Understanding the Activity Filters feature
- Checking compatibility
- Preparing the combined branch

The button should become enabled when the system reaches a safe ready state.

The analysis remains real.

Do not mock or bypass it.

---

# Persistent Combination Tray

Create a sticky or persistent action area that remains visible while working.

It should show:

Version A
Collapsible Sidebar

Version B
Activity Filters

Compatibility:
Ready to combine

Primary action:
Create combined branch

Secondary action:
Technical details

The user should not have to scroll to the bottom of a long page to find the next action.

At 1440×900, this tray must remain accessible without repeatedly scrolling the document.

---

# Compatibility Language

Translate internal analysis states into clear user-facing language.

## Ready

“These features can be combined safely.”

## Analysis in progress

“Checking the source and supporting code behind both selections.”

## Partial

“We found the selected feature, but could not safely include one of its required dependencies.”

## Stale

“Version A was restarted. Select that feature again before creating the branch.”

## Conflict

“Both versions change the same React component in incompatible ways.”

## Unsupported

“This feature relies on a code pattern UI Merge Studio cannot safely reconstruct yet.”

Every blocked state must answer:

1. What happened?
2. Why is automatic integration unsafe?
3. Was any candidate branch created?
4. Were the source branches changed?
5. What should the user do next?
6. Where can technical evidence be viewed?

Do not show raw stack traces as the primary message.

---

# Readable Candidate Plan

Before mutation, provide a readable confirmation summary.

Example:

Ready to create `combined-result`

Included from Version A:
- Collapsible Sidebar
- Supporting navigation component
- Sidebar state hook
- Sidebar styles
- Sidebar test

Included from Version B:
- Activity Filters
- Activity filtering hook
- Inspector integration
- Filter styles
- Inspector test

Not included:
- Alternate dashboard heading
- Ticket sorting change

Verification:
- TypeScript
- Feature tests
- Full tests
- Production build

Primary action:
Create and verify branch

Secondary action:
View exact source plan

The technical view may show:

- 23 deterministic operations;
- 16 files;
- operation types;
- files grouped by operation;
- exact identities;
- source commits;
- expected hashes.

Do not force users to inspect a Network response.

---

# Step 4 — Generate and Verify

After the user clicks Create combined branch, show a focused progress experience.

Required truthful stages:

1. Preparing clean workspace
2. Applying Collapsible Sidebar
3. Applying Activity Filters
4. Updating imports and supporting code
5. Checking changed files
6. Checking TypeScript
7. Running feature tests
8. Running full tests
9. Creating production build
10. Creating combined branch
11. Cleaning temporary workspace

Show:

- current stage;
- completed stages;
- elapsed time;
- failure stage;
- whether rollback occurred;
- retry action when safe;
- expandable technical logs.

Do not use fake progress percentages.

Progress must be tied to real server phases.

Do not present “23 AST operations” as the primary status.

Technical operation counts may appear inside Technical Details.

---

# Success Experience

On success, show a focused result state:

Combined branch ready

Branch:
combined-result

Included:
- Collapsible Sidebar
- Activity Filters

Verification:
- TypeScript passed
- Feature tests passed
- Full tests passed
- Production build passed

Primary action:
Open combined app

Secondary actions:

- Compare result
- View changed files
- View technical report
- Copy branch name

The candidate-launch action must be immediately visible.

The user must not need to search through earlier panels.

---

# Result Comparison

Add a clear post-generation comparison option.

Allow the user to view:

- Version A;
- Version B;
- Combined result.

This can be a three-tab or focused comparison experience.

The combined result must clearly demonstrate:

- the collapsible sidebar is present;
- Activity Filters are present;
- the unrelated heading change is absent;
- the unrelated sorting change is absent.

Do not hard-code those expectations into the generic generator.

Fixture scenario metadata may describe the demo expectations for presentation and automated validation.

---

# Fixture and Demo Clarity

The controlled fixture must be explicitly presented as a sample application.

The first viewport should explain:

Demo repository:
Sample Support Dashboard

Demo goal:
Combine the collapsible sidebar from Version A with the activity filters from Version B.

Supporting explanation:

“Sample support tickets are used to demonstrate synchronized navigation, visual feature selection, and verified branch generation.”

Rename or contextualize “Beacon Ops.”

Preferred names include:

- Support Desk
- Sample Support Dashboard
- Customer Support Demo

Choose a professional name that clearly reads as a sample product.

Do not leave “Beacon Ops” unexplained.

Tickets may remain because they create meaningful UI interactions and synchronization.

The product must explain why they exist.

Keep fixture-specific presentation data in a scenario configuration layer rather than scattered conditionals.

---

# Demo Scenario Configuration

Create a clean configuration model capable of supplying:

- demo name;
- repository display name;
- short description;
- demo task;
- Version A display name;
- Version B display name;
- raw branch references;
- human-readable feature labels;
- route context;
- fixture-data explanation;
- candidate branch name;
- verification descriptions;
- optional expected demo assertions.

Presentation metadata must not influence dependency analysis or source transformation.

Generic engine behavior must remain driven by:

- Git;
- ASTs;
- source identities;
- dependency evidence;
- immutable slice artifacts;
- deterministic plans.

---

# Layout Requirements

Redesign the page around the viewport rather than a long document.

At 1440×900:

- the product explanation must be visible;
- both version headers must be visible;
- both preview areas must dominate the page;
- the current selections must remain visible;
- the primary next action must remain visible;
- the user must not repeatedly scroll between preview and controls;
- advanced technical details must not expand the whole page;
- technical content should scroll independently;
- the overall page must not require horizontal scrolling.

Use:

- sticky controls;
- a persistent bottom action tray;
- a compact top workflow header;
- independent technical drawers;
- resizable previews where useful;
- internal preview scrolling.

Test layouts at:

- 1280×720;
- 1440×900;
- 1920×1080.

Tablet layout should degrade reasonably.

Mobile editing is not a Phase 0 requirement.

---

# Visual Design Requirements

Create a polished, serious local developer-tool interface.

Requirements:

- strong visual hierarchy;
- restrained visual language;
- limited simultaneous card containers;
- compact headers;
- consistent spacing;
- clear primary action;
- clear disabled-state explanations;
- readable status treatment;
- skeleton/loading states;
- useful empty states;
- concise microcopy;
- polished refusal and success states;
- focus-visible styles;
- restrained motion;
- no giant blank diagnostic blocks;
- no wall of panels;
- no fake terminal aesthetic unless displaying real logs;
- no generic AI-dashboard gradients;
- no design-system dependency unless justified.

The interface should feel like a focused developer product, not an admin dashboard or research notebook.

---

# Default Guided-Mode Language

The following terms must not be visible in Guided Mode:

- Hovered boundary
- Selected boundary
- Eligible ancestors
- Feature slice
- Merge base
- Branch commit
- Included changes
- Excluded branch changes
- Unresolved dependencies
- Test-file slices
- Required import specifiers
- Definition boundary
- Runtime instance
- Schema-v2
- Proven-unrelated
- Operation ID
- Candidate preflight

Replace them with:

- Selection preview
- Selected feature
- Choose a different level
- Supporting code
- Shared starting point, only when needed
- Source version, only when needed
- Included
- Not included
- Could not safely include
- Related tests
- Supporting imports
- Technical details
- Compatibility check
- Create combined branch

Internal terminology may remain inside Technical Details.

---

# API Latency and Preview-Orchestration Defect

Manual browser inspection showed repeated requests to endpoints such as:

- /api/previews/left
- /api/previews/right

Some requests remained pending for approximately one to two minutes.

The overall dual-preview launch took approximately three minutes.

The browser also accumulated repeated preview-status requests.

Treat this as a concrete performance and request-lifecycle defect.

Do not merely add a spinner.

---

# Required API Instrumentation

Instrument server-side duration for each preview lifecycle phase:

1. Request received
2. Request queued
3. Request validation
4. Existing-operation detection
5. Worktree preparation
6. Dependency preparation
7. Preview process spawn
8. Vite server startup
9. Port readiness
10. Instrumentation handshake
11. Capability negotiation
12. Synchronization readiness
13. Response completion

Record:

- operation ID;
- preview side;
- branch;
- generation;
- timestamps;
- phase durations;
- total duration;
- terminal status;
- cancellation status;
- cache-reuse status.

Expose timings in Technical Details and structured logs.

Do not expose noisy timings in the primary Guided Mode unless they help explain current progress.

---

# Required Preview API Architecture

Investigate why the initiating launch request remains pending for minutes.

Prefer an asynchronous operation model.

Required behavior:

1. A preview launch request validates quickly.
2. It returns an operation identifier promptly.
3. Expensive work continues as an explicit server-managed operation.
4. The UI observes progress separately.
5. The UI may use:
   - bounded polling;
   - server-sent events;
   - WebSocket events;
   - another existing suitable mechanism.
6. The initiating HTTP request must not stay pending for several minutes.
7. Every operation must have:
   - pending;
   - running;
   - ready;
   - failed;
   - cancelled;
   - superseded states.
8. Old operations must not overwrite newer generations.
9. Restarting a preview must supersede or cancel its previous startup operation safely.
10. Duplicate launch requests for the same side, branch, and generation must coalesce rather than starting duplicate work.
11. The UI must be able to cancel a startup operation where safe.
12. Server shutdown and test teardown must cancel active operations and clean worktrees/processes.

Do not reduce Git isolation to achieve faster responses.

---

# Polling Audit

Audit the existing preview-status request behavior for:

- duplicate intervals;
- overlapping requests;
- requests continuing after readiness;
- requests continuing after failure;
- requests continuing after component unmount;
- requests continuing after preview restart;
- stale operation IDs;
- stale generation updates;
- retries without backoff;
- multiple React effects creating polling loops;
- React StrictMode duplication;
- simultaneous polling from multiple components;
- polling while a previous request is still pending;
- polling when the browser tab is hidden;
- request storms caused by state updates.

Required corrections:

- only one active status request per operation;
- no overlapping status calls;
- bounded polling interval;
- backoff where appropriate;
- immediate stop on terminal state;
- cancellation through AbortController or equivalent;
- stale-response rejection;
- cleanup on unmount;
- cleanup on operation replacement;
- explicit timeout;
- visible failure state;
- tests proving polling terminates.

Report:

- total preview API calls before and after;
- duplicate request count before and after;
- overlapping request count before and after;
- longest request duration before and after;
- median request duration;
- average polling interval;
- time to first progress response;
- time to ready;
- time to terminal failure;
- requests remaining after terminal state.

---

# Startup Performance Investigation

Measure separately:

## Cold launch

No prepared worktrees or reusable dependency state.

## Warm launch

Dependencies and safe caches already exist.

## Single preview restart

One preview restarts while the other remains ready.

Measure:

- worktree creation;
- dependency preparation;
- install duration;
- process spawn;
- Vite readiness;
- instrumentation readiness;
- synchronization;
- total time.

Identify repeated work.

Investigate safe improvements such as:

- dependency cache reuse;
- package-manager offline/prefer-offline behavior;
- immutable dependency sharing where safe;
- avoiding redundant installs;
- prepared-worktree reuse when source commit is unchanged;
- parallel preparation of Version A and Version B;
- parallel process startup;
- avoiding duplicate fixture regeneration;
- avoiding repeated type/build work during preview startup;
- improved readiness detection;
- eliminating unnecessary polling delay;
- reusing the package manager store;
- bounded process health checks.

Do not:

- mutate source branches;
- share writable node_modules unsafely;
- skip required isolation;
- fake readiness;
- mark a preview ready before instrumentation works;
- claim performance improvement without evidence.

Targets for the controlled fixture after dependencies are available:

- warm launch of both previews: target under 20 seconds;
- single preview restart: target under 10 seconds;
- time to first truthful progress update: target under 1 second;
- launch API acknowledgment: target under 1 second under normal local conditions.

Measure actual results.

If the environment prevents meeting a target:

- report the measured result;
- identify the bottleneck;
- explain why the target was missed;
- identify the smallest next optimization.

Do not claim PASS for a target that was not measured.

---

# Loading Experience

While previews are starting, show real progress.

Example:

Preparing Version A
Preparing Version B
Creating isolated workspaces
Preparing dependencies
Starting development servers
Waiting for applications
Connecting source mapping
Synchronizing previews

Each stage must reflect real server state.

Show Version A and Version B independently.

A slow Version B must not make Version A look stalled.

Allow safe retry of a failed side without restarting both.

Provide:

- elapsed time;
- cancel action;
- retry action;
- concise failure reason;
- technical details.

Do not display a generic spinner for several minutes.

---

# State and Interaction Architecture

Inspect the current orchestration state before implementing.

Use an explicit state model for each preview:

- stopped
- preparing
- starting
- connecting
- ready
- failed
- stopping
- superseded

Use an explicit state model for the workflow:

- compare
- selecting
- analyzing
- compatible
- incompatible
- generating
- verifying
- complete
- failed
- stale

A small internal reducer or state machine is acceptable.

Do not introduce a large state-machine dependency unless it clearly improves correctness.

Avoid spreading workflow logic across many unrelated component effects.

Separate:

- server operation state;
- UI presentation state;
- selected feature state;
- analysis artifact state;
- candidate generation state.

---

# Technical Details Requirements

Technical Details must preserve the engineering evidence.

## Selection details

Show:

- selected React component;
- presentation label;
- source file and line;
- exact or fallback mapping;
- definition identity;
- preview session;
- branch and commit;
- alternative selectable levels;
- selection-promotion reasoning.

## Supporting code

Show:

- components;
- hooks;
- utilities;
- state;
- types;
- styles;
- assets;
- tests;
- supporting imports;
- evidence edges;
- exclusions;
- unresolved dependencies;
- deterministic JSON download.

## Candidate plan

Show:

- base commit;
- source commits;
- candidate branch;
- operations grouped by file;
- operation type;
- source region;
- target identity;
- precondition;
- expected content hash;
- conflicts;
- planned changed files;
- verification commands.

## Candidate result

Show:

- branch;
- commit;
- parent;
- tree hash;
- exact changed-file audit;
- verification outcomes;
- cleanup status;
- report download;
- idempotence result.

Do not delete any currently available evidence.

---

# Failure and Refusal UX

Create polished product states for:

- preview startup failure;
- dependency preparation failure;
- process spawn failure;
- Vite readiness timeout;
- synchronization incompatibility;
- source mapping unavailable;
- ambiguous selection;
- partial supporting-code analysis;
- stale selection;
- dirty repository;
- incompatible features;
- candidate branch already exists unexpectedly;
- transformation failure;
- TypeScript failure;
- focused test failure;
- full test failure;
- production-build failure;
- cleanup warning;
- cancelled operation;
- superseded operation.

Every failure state must explain:

1. What happened?
2. Which stage failed?
3. Why the tool stopped?
4. Was a candidate branch created?
5. Were source branches changed?
6. Was the temporary workspace cleaned?
7. What can the user do next?
8. Where are the technical logs?

Never imply success after rollback.

---

# Accessibility Requirements

Guided Mode must support:

- keyboard navigation;
- logical tab order;
- visible focus indicators;
- accessible control names;
- preview selection without precision-only mouse interaction;
- screen-reader announcements for selection;
- screen-reader announcements for startup progress;
- screen-reader announcements for candidate progress;
- non-color-only status communication;
- correct heading hierarchy;
- focus movement on error;
- focus movement on success;
- escape-to-close for drawers and dialogs;
- reduced-motion preferences;
- selection overlays that do not block application interaction unexpectedly.

Provide a keyboard-accessible way to inspect available feature regions in a preview.

Do not make the user depend entirely on hovering.

---

# Architecture Constraints

Preserve:

- React;
- TypeScript;
- Vite;
- existing server boundaries;
- local Git repositories;
- Git worktree isolation;
- existing branch safety;
- current instrumentation;
- source mapping;
- feature analysis;
- candidate planning;
- candidate generation;
- verification gates;
- rollback;
- machine-readable reports;
- deterministic refusal.

Do not:

- add an LLM;
- ask an LLM to merge source;
- mock successful analysis;
- mock successful generation;
- hard-code candidate success;
- hard-code the expected 16-file result;
- hard-code fixture component names into generic merge logic;
- bypass compatibility analysis;
- bypass verification;
- delete technical evidence;
- weaken types;
- suppress errors;
- disable slow tests;
- skip cleanup;
- replace the app with static mockups;
- build only screenshots;
- start cloud work;
- start authentication;
- start collaboration features;
- start FlowCraft validation;
- turn the product into a generic coding agent.

---

# Suggested Component Structure

Inspect the repository and select the smallest coherent architecture.

A reasonable direction may include:

- GuidedWorkspace
- ProductHeader
- WorkflowStepper
- DemoContext
- VersionPreview
- PreviewProgress
- SelectionOverlay
- SelectionConfirmation
- SelectedFeaturesTray
- CompatibilityStatus
- CandidatePlanSummary
- GenerationProgress
- SuccessSummary
- RefusalSummary
- TechnicalDetailsDrawer
- ChangedFilesView
- DemoScenarioConfig

These names are suggestions.

Do not create one giant App component.

Do not over-componentize trivial markup.

Keep orchestration testable.

---

# Required User-Experience Tests

Add automated tests that prove real user experience.

## Guided happy path

At 1440×900:

1. Open UI Merge Studio.
2. Verify the product headline is understandable.
3. Verify the demo repository and task are explained.
4. Verify Version A and Version B are clearly labeled.
5. Launch both versions.
6. Verify truthful progress stages appear.
7. Verify the initiating launch API acknowledges quickly.
8. Verify both previews become ready.
9. Click a nested sidebar navigation item.
10. Verify the meaningful Collapsible Sidebar feature is selected automatically or clearly recommended.
11. Verify no “Eligible ancestors” interaction is required.
12. Select Activity Filters from Version B.
13. Verify both selected features appear in the persistent tray.
14. Verify real supporting-code analysis occurs.
15. Verify compatibility becomes Ready to combine.
16. Verify a readable plan summary is available.
17. Click one Create combined branch action.
18. Verify real generation and verification stages occur.
19. Verify success summary appears.
20. Launch the real combined candidate.
21. Verify the collapsible sidebar works.
22. Verify Activity Filters work.
23. Verify the unrelated heading is excluded.
24. Verify the unrelated sorting change is excluded.
25. Verify technical evidence remains available.

Do not mock the central end-to-end path.

---

## No-jargon test

In Guided Mode, assert that these terms are not visible:

- Hovered boundary
- Selected boundary
- Eligible ancestors
- Feature slice
- Merge base
- Test-file slices
- Required import specifiers
- Definition boundary
- Runtime instance
- Schema-v2
- Proven-unrelated
- Candidate preflight

---

## Technical-details test

Open Technical Details.

Verify the user can inspect:

- source mapping;
- supporting code;
- tests;
- exclusions;
- exact commits;
- candidate operations;
- changed files;
- verification commands;
- report download.

---

## Selection-promotion test

Click a deeply nested component in a changed feature.

Verify:

- the meaningful feature level is selected automatically when deterministic;
- the user is not forced through an ancestor-debugging panel;
- alternate levels remain available through secondary UI;
- the selected source identity remains deterministic.

---

## Ambiguous-selection test

Create a controlled case with multiple plausible changed ancestors.

Verify:

- the tool does not silently choose an unsafe level;
- the UI presents readable alternatives;
- technical identities are available;
- the workflow remains understandable.

---

## Stale-selection test

Restart one preview after selection.

Verify:

- only that preview’s selection becomes stale;
- the combination action is blocked;
- the message explains what happened;
- the user is directed to reselect;
- stale API responses cannot restore the old selection.

---

## Refusal test

Run a controlled incompatible combination.

Verify:

- generation is blocked;
- the explanation is understandable;
- no candidate branch is created;
- source branches remain unchanged;
- technical conflict evidence is available;
- the user receives a manual next step.

---

## API acknowledgment test

Verify a preview launch request returns quickly with an operation ID.

Do not allow the initiating request to remain open throughout worktree creation and Vite startup.

---

## Polling test

Verify:

- only one active status request per operation;
- requests do not overlap;
- requests stop after ready;
- requests stop after failure;
- requests stop after cancellation;
- requests stop after supersession;
- stale responses are ignored;
- unmount aborts active requests;
- retry behavior is bounded.

---

## Duplicate-launch test

Trigger the same launch action more than once.

Verify:

- duplicate operations are coalesced or rejected clearly;
- multiple worktrees are not created;
- multiple Vite processes are not created;
- progress remains consistent.

---

## Cancellation test

Cancel a running preview launch.

Verify:

- the operation becomes cancelled;
- process/worktree cleanup occurs;
- stale completion cannot mark it ready;
- the user can retry safely.

---

## Progress test

Verify truthful real stages appear during preview startup and candidate generation.

Do not mock instant readiness.

---

## Responsive tests

Capture and inspect:

- 1280×720;
- 1440×900;
- 1920×1080.

Verify:

- no overall horizontal scrolling;
- previews remain usable;
- persistent actions remain reachable;
- the user does not repeatedly scroll the document.

---

## Accessibility test

Run automated accessibility checks.

Test keyboard completion of the guided selection and generation workflow where technically possible.

---

## Cleanup test

After:

- success;
- failure;
- cancellation;
- restart;
- supersession;
- Playwright teardown;

verify:

- no temporary preview worktrees remain;
- no candidate-generation worktrees remain;
- no orphan Vite processes remain;
- no polling loops remain;
- no stale server operations remain.

---

# Performance Tests and Evidence

Create deterministic performance instrumentation and bounded tests where possible.

Do not write brittle tests that depend on exact machine speed.

Use assertions such as:

- API acknowledgment completes before expensive preparation finishes;
- dual preview preparation executes concurrently where safe;
- duplicate requests do not create duplicate operations;
- polling stops on terminal state;
- warm launch reuses safe preparation state;
- restart avoids redundant dependency work where source commit is unchanged.

Record manual timings for:

- current cold dual launch;
- improved cold dual launch;
- current warm dual launch;
- improved warm dual launch;
- current single restart;
- improved single restart;
- time to first visible progress;
- API acknowledgment latency;
- longest status request;
- total status request count.

Provide before-and-after evidence.

---

# Existing Regression Requirements

All Prompt 001–005 behavior must remain functional.

Inspect `package.json` and documentation first.

Run the repository’s actual commands for:

- typecheck;
- complete Vitest suite;
- instrumentation tests;
- preview runtime tests;
- multi-preview synchronization tests;
- source-mapping tests;
- feature-analysis tests;
- test-slicing tests;
- candidate-generation tests;
- candidate integration;
- complete Playwright;
- production build;
- fixture verification.

Do not invent command names.

Do not omit slow suites silently.

Report every exact command and result.

---

# Manual First-Time-User Evaluation

After implementation, perform a real manual evaluation.

Use:

- a fresh browser session;
- no DevTools;
- no prior app state;
- 1440×900 viewport.

Complete the full workflow without relying on internal terminology.

Record:

1. What is visible within the first five seconds.
2. Whether the product purpose is immediately clear.
3. Whether the demo application is explained.
4. Whether the ticket data is explained.
5. Number of primary clicks required.
6. Number of times the document must be scrolled.
7. Whether the user must open Technical Details.
8. Whether an ancestor panel is required.
9. Whether separate Analyze and Prepare Plan buttons are required.
10. Cold launch duration.
11. Warm launch duration.
12. Single restart duration.
13. Launch API acknowledgment duration.
14. Time to first visible progress.
15. Number of preview API calls.
16. Number of duplicate or overlapping requests.
17. Selection clarity.
18. Compatibility clarity.
19. Plan clarity.
20. Generation clarity.
21. Success clarity.
22. Refusal clarity.
23. Whether the product can be demonstrated without verbal coaching.

Capture before-and-after screenshots at the same viewport.

Screenshots are evidence, not substitutes for real behavior.

---

# Documentation Requirements

Update:

- README.md
- docs/product-brief.md
- docs/decision-log.md
- docs/risk-register.md
- docs/limitations.md
- docs/evaluation.md
- docs/demo-script.md

Create:

- docs/adr/0007-guided-progressive-disclosure-experience.md
- docs/ux-evaluation.md
- docs/performance-evaluation.md
- docs/codex-prompts/006-guided-product-experience.md

Store this prompt exactly.

The README must begin with product clarity rather than internals.

Recommended opening:

# UI Merge Studio

Compare multiple React implementations, click the features you prefer, and generate one verified combined branch.

Compare → Select → Combine → Verify

Then explain:

- what it proves;
- how to run the demo;
- what remains unsupported;
- where architecture details live.

Do not lead with ASTs, schema versions, or Git topology.

---

# Acceptance Criteria

Prompt 006 passes only if every required category below passes.

## Five-second clarity

A first-time viewer can identify:

- what the product does;
- what Version A and Version B represent;
- what action to take;
- what output will be created.

## Fixture clarity

The demo application and sample tickets are explained.

“Beacon Ops” is renamed or contextualized.

## Guided workflow

The workflow is:

Compare → Select → Combine → Verify

The user does not need to understand internal engine concepts.

## Direct meaningful selection

The user selects meaningful features directly inside previews.

Clicking a nested implementation component does not force manual ancestor debugging.

## One primary combine action

The default user does not need to manually run:

- Analyze feature slice;
- Prepare candidate plan;
- Generate candidate.

The real phases still occur internally.

## Minimal scrolling

At 1440×900, the happy path is completable without repeatedly scrolling between previews and controls.

## Progressive disclosure

Technical evidence remains fully available in a secondary experience.

## Readable plan

The user can understand what will be included and excluded before generation.

DevTools is not required.

## Truthful progress

Preview startup and candidate generation display real stages.

## API responsiveness

The preview launch endpoint acknowledges promptly and returns an operation identifier.

It does not remain pending throughout multi-minute preparation.

## Polling correctness

Duplicate and overlapping polling is prevented.

Polling stops immediately on terminal state.

## Startup evidence

Cold launch, warm launch, and restart durations are measured.

Improvements are evidenced rather than claimed.

## Success clarity

The generated branch, included features, verification results, and launch action are immediately visible.

## Refusal clarity

Unsafe combinations are blocked and explained without raw implementation jargon.

## Accessibility

The guided workflow is keyboard accessible and passes appropriate automated checks.

## Real backend

The interface uses the real:

- source mapper;
- analyzer;
- planner;
- generator;
- verifier;
- rollback;
- cleanup.

## Regression safety

All previous technical tests remain passing.

## Recruiter demo

The product can be demonstrated without the project author explaining every panel.

---

# Failure Criteria

Mark Prompt 006 as MODIFY or ABANDON if any of the following are true:

- The change is mainly colors, spacing, and renamed headings.
- The research-console information architecture remains.
- Technical panels still dominate Guided Mode.
- The user must use “Eligible ancestors.”
- The user must manually understand “Feature slice.”
- The user must separately trigger unexplained Analyze, Preflight, and Generate steps.
- The user repeatedly scrolls between previews and controls.
- Beacon Ops or ticket data remain unexplained.
- Plan details remain available only through API responses or DevTools.
- Preview launch API calls remain pending for minutes.
- Duplicate or overlapping status requests continue.
- Polling continues after terminal state.
- Performance delay is cosmetically hidden behind animations.
- No phase timing evidence is collected.
- Startup improvements weaken worktree isolation.
- The candidate engine is mocked.
- Success is hard-coded.
- Fixture component names control generic merge logic.
- Existing diagnostics are deleted instead of moved.
- Existing technical tests are weakened.
- Slow tests are disabled.
- Type safety is weakened.
- Cleanup guarantees regress.
- The final experience still requires continuous verbal coaching.
- The final UI is visually cleaner but not meaningfully easier to use.

---

# Required Implementation Process

1. Inspect the existing repository before editing.
2. Run the current product.
3. Capture baseline screenshots.
4. Measure current API request behavior and launch timings.
5. Read Prompt 001–005 documentation and ADRs.
6. Produce a concise UX and performance diagnosis.
7. Categorize current UI elements as:
   - essential user-facing;
   - advanced-only;
   - redundant;
   - implementation leakage.
8. Design the new information architecture.
9. Design the asynchronous preview operation lifecycle.
10. Define state transitions and cancellation semantics.
11. Implement changes in small, reviewable commits.
12. Preserve engine interfaces unless a justified orchestration API change is required.
13. Add happy-path, failure-path, stale, refusal, cancellation, accessibility, polling, and cleanup tests.
14. Run all previous regression suites.
15. Complete the manual first-time-user evaluation.
16. Compare the final result against every acceptance and failure criterion.
17. Recommend PASS, MODIFY, or ABANDON honestly.

Do not stop after creating mockups.

Implement and run the real product.

---

# Required Completion Report

Return a structured report containing:

1. Starting branch and commit.
2. Baseline UX defects observed directly.
3. Baseline API defects observed directly.
4. Baseline cold launch timing.
5. Baseline warm launch timing.
6. Baseline restart timing.
7. Baseline launch API acknowledgment time.
8. Baseline preview API call count.
9. Baseline duplicate/overlapping request count.
10. Root cause of multi-minute pending API calls.
11. Root cause of repeated polling.
12. UX information-architecture decisions.
13. New Guided Mode workflow.
14. New Technical Details workflow.
15. Fixture-context changes.
16. Beacon Ops rename/context decision.
17. Selection-promotion strategy.
18. Ambiguous-selection behavior.
19. Human-readable feature-label strategy.
20. Layout and scrolling changes.
21. Persistent action-area behavior.
22. Readable candidate-plan experience.
23. Preview loading experience.
24. Asynchronous preview operation architecture.
25. Cancellation and supersession behavior.
26. Polling lifecycle changes.
27. Candidate-generation progress experience.
28. Success experience.
29. Failure and refusal experience.
30. Accessibility changes.
31. Files changed.
32. Components added.
33. Components removed or replaced.
34. Server/API changes.
35. Generic logic versus fixture metadata.
36. Existing engine behavior preserved.
37. New tests added.
38. Exact commands run.
39. Complete Vitest results.
40. Focused preview/orchestration test results.
41. Candidate-generation test results.
42. Playwright results.
43. Accessibility results.
44. Build results.
45. Fixture verification result.
46. Improved cold launch timing.
47. Improved warm launch timing.
48. Improved restart timing.
49. Improved API acknowledgment time.
50. Improved preview API call count.
51. Improved duplicate/overlapping request count.
52. Time to first truthful progress.
53. Longest request duration before and after.
54. Manual first-time-user walkthrough.
55. Final number of primary clicks.
56. Final number of document scrolls.
57. Whether DevTools was required.
58. Whether verbal coaching was required.
59. Before-and-after screenshots.
60. Remaining UX limitations.
61. Remaining performance limitations.
62. Risks introduced.
63. Anti-hard-coding audit.
64. Source-branch immutability audit.
65. Worktree cleanup audit.
66. Process cleanup audit.
67. Polling cleanup audit.
68. Commits created.
69. What has actually been proven.
70. What remains unproven.
71. Final recommendation: PASS, MODIFY, or ABANDON.

Do not recommend PASS merely because the application looks better.

PASS requires the experience to be:

- immediately understandable;
- materially easier to operate;
- responsive at the API level;
- truthful about long-running work;
- technically evidence-backed;
- deterministic;
- safe;
- accessible;
- demo-ready.