Prompt 008 — External Vite Candidate Generation
Objective

Prove whether UI Merge Studio’s existing deterministic integration engine can take two visually selected features from an unrelated React/TypeScript/Vite repository and create one verified candidate branch without:

broad branch merging;
cherry-picking feature commits;
repository-specific component hard-coding;
manual filename selection;
unrelated-change leakage;
delegating the merge to an LLM.

The milestone must validate the full external path:

external rendered selection
→ runtime React identity
→ exact source declaration
→ Git diff from common base
→ dependency slice
→ compatibility plan
→ deterministic candidate generation
→ typecheck/tests/build/runtime verification
→ live combined external application

This is a falsification milestone, not a feature-expansion milestone.

Return PASS, MODIFY, or ABANDON based on evidence. Do not force success.

Repository Context
UI Merge Studio repository
C:\Users\rekha\OneDrive\Documents\UI merge studio

Expected current branch before starting:

main

Expected current head:

e7b1b48 docs: publish project overview and evidence

Recent important commits:

e7b1b48 docs: publish project overview and evidence
fe5f8a5 chore: prepare repository for public release
0c84446 feat: validate external Vite source mapping
4206507 docs: record FlowCraft validation boundary
5e32bb0 feat: unify guided visual system

The repository has already been published at:

https://github.com/varun-raj-77/ui-merge-studio

Do not assume the repository state. Inspect it first.

Create and work only on a dedicated branch:

codex/external-vite-candidate-generation

Do not commit directly to main.

External validation repository
C:\Users\rekha\OneDrive\Documents\ui-merge-vite-validation

Previously recorded baseline:

main
8223897 Add profile page and agent guidelines

Previously recorded validation branches:

ui-merge-validation-left
ui-merge-validation-right

Previously recorded commits:

left:  3cecf70
right: 64496eb

Verify all branch names, commits, ancestry, cleanliness, and worktree state directly. Do not rely only on this prompt.

Previously validated external selections

Left selection:

Rendered region: Validation workspace
React component: PageContent
Source: src/components/layout/contentbar.tsx
Previously observed location: line 25, column 7

Right selection:

Rendered region: Validated revenue outlook
React component: RevenueTrendChart
Source: src/views/dashboard/index.tsx
Previously observed location: line 26, column 7

Runtime source instrumentation already proved that these mappings were produced generically without repository-specific component-name configuration.

Do not hard-code these component names into production logic to make this milestone pass.

They may appear in tests only as expected external evidence after the generic pipeline resolves them.

Product Source of Truth

UI Merge Studio must remain:

Visually select preferred features from multiple running React branches and create one verified combined branch.

Every source change included in the candidate must trace to:

a rendered feature selected through UI Merge Studio; or
a dependency required by that selected feature.

The visual comparison must remain causally connected to source integration.

The candidate must not become the result of a general branch merge with visual selection used merely as decoration.

Existing Proven Capabilities

Do not rebuild these from scratch unless a defect directly blocks this milestone:

local Git repository inspection;
merge-base analysis;
isolated Git worktrees;
multi-process Vite preview execution;
managed ports;
runtime React source instrumentation;
rendered element-to-source mapping;
stale-session and commit-identity validation;
TypeScript/TSX source indexing;
controlled dependency slicing;
test slicing;
deterministic candidate planning;
candidate branch generation;
import reconciliation;
verification gates;
runtime launch;
idempotence handling;
cleanup and rollback;
controlled unsafe-combination refusal.

Controlled candidate generation has already passed.

External Vite execution and generic runtime-to-source mapping have already passed.

This milestone exists because the following remain unproven externally:

dependency slicing;
unrelated-change exclusion;
candidate generation;
combined-result verification;
deterministic regeneration.
Required First Actions

Before editing any file, inspect both repositories.

UI Merge Studio inspection

Run and report:

git status --short
git branch --show-current
git log -5 --oneline
git remote -v
git worktree list

Verify that main is clean and points to the expected published state.

Create:

git switch -c codex/external-vite-candidate-generation

If the branch already exists, inspect it rather than deleting or resetting it blindly.

External repository inspection

Run and report:

git status --short
git branch -vv
git log --oneline --decorate --graph --all -20
git merge-base main ui-merge-validation-left
git merge-base main ui-merge-validation-right
git diff --stat main...ui-merge-validation-left
git diff --stat main...ui-merge-validation-right
git worktree list

Verify:

both validation branches descend from the exact intended base;
both are one bounded feature branch or otherwise explain the real history;
source branches are clean;
no candidate branch from a previous attempt exists;
no stale temporary worktrees exist;
no preview processes or expected ports are still active.

Do not mutate the external source branches.

Record the exact initial commit hashes for:

base;
left branch;
right branch.
External Branch Design Audit

Before running candidate generation, inspect the actual diffs.

Determine whether each branch contains:

the selected visible change;
direct supporting imports;
transitive dependencies;
types;
hooks;
styles;
assets;
tests;
unrelated edits.

A meaningful external validation must include at least some supporting dependency or integration structure beyond replacing one text literal.

If the existing external branches are too trivial to test candidate generation honestly, do not silently pretend otherwise.

In that case:

report why they are insufficient;
create the smallest defensible additional branch changes from the same exact base;
ensure those changes remain visible and selectable through the rendered UI;
include supporting code and unrelated edits;
commit the branch fixtures clearly;
do not encode source mapping in commit messages, branch names, metadata, or test configuration.

Any enhancement to the validation branches must remain bounded and must not turn into a custom repository designed around the engine.

Do not weaken the external repository’s existing behaviour.

Core Implementation Task

Extend or correct the existing deterministic pipeline only as much as necessary to support candidate generation for this external Vite repository.

The full workflow must be initiated from the two external rendered selections.

1. Launch external previews

Start both external branches as:

isolated Git worktrees;
separate Vite processes;
separate managed ports;
real interactive applications.

Use the existing generic repository configuration introduced by Prompt 007B.

Do not add repository-specific component mappings.

2. Capture selections through the running UI

Select the two external rendered regions through UI Merge Studio.

The resulting evidence must include:

repository identity;
branch;
branch commit;
merge base;
preview slot;
preview session identity;
runtime instance;
component declaration;
source file;
line and column;
stable source identity.

Do not manually construct selection artifacts.

3. Analyze dependency slices

Run the existing source-analysis pipeline against each selected declaration.

For each slice, report:

selected root declaration;
changed declarations included;
supporting declarations included;
imports included;
types included;
styles/assets included;
test units included;
whole-file inclusions;
excluded branch changes;
unresolved dependencies;
boundary escalations;
unsupported patterns;
exact Git evidence.

The analyzer must operate from:

runtime selection evidence;
Git diffs;
AST/source relationships.

It must not use:

branch-name semantics;
visible label text as source mapping;
manual file lists;
repository-specific component tables;
commit-message hints.
4. Plan compatibility before mutation

Produce a read-only compatibility plan before creating any candidate branch or worktree.

The plan must answer:

exact base commit;
selected source units;
supporting dependency units;
expected changed files;
expected excluded files;
import reconciliation steps;
test reconstruction steps;
possible declaration conflicts;
possible symbol/import collisions;
unsupported ownership ambiguities;
whether the candidate is safe to attempt.

No branch creation or source mutation may occur before the plan is accepted.

5. Generate the candidate

Create a new external candidate branch from the exact common base.

Preferred candidate branch name:

ui-merge-validation-combined

If that branch already exists:

inspect its tree and provenance;
remove or replace it only if safe and justified;
preserve evidence;
do not overwrite unrelated user work.

Candidate generation must be deterministic and constrained by the approved slices.

Allowed mechanisms:

declaration-level reconstruction;
AST-aware transformations;
exact patch application tied to selected declarations;
deterministic import reconciliation;
fully owned whole-file additions when proven necessary.

Disallowed mechanisms:

git merge of either feature branch;
git cherry-pick of feature commits;
copying the entire changed file when only one declaration is selected, unless whole-file ownership is explicitly proven;
applying all branch diffs and deleting unwanted changes afterward;
manually supplying the desired file list;
asking an LLM to write the combined implementation;
repository-specific switch statements for PageContent or RevenueTrendChart.
6. Audit unrelated-change exclusion

Compare:

base → left branch
base → right branch
base → candidate

For every candidate change, show its provenance:

selected feature
or
required dependency

Explicitly list excluded branch changes.

The milestone fails if unrelated edits appear in the candidate without dependency evidence.

7. Verify the candidate

Run the external repository’s real commands based on its inspected package.json.

At minimum, run:

dependency installation using the repository’s package manager;
TypeScript typecheck;
full existing test suite;
relevant focused tests;
production build;
runtime launch;
Playwright or equivalent browser verification.

Do not invent scripts that do not exist without explaining why they were added.

Do not:

skip failing tests;
disable tests;
loosen TypeScript configuration;
add any to silence failures;
suppress errors;
mock success;
replace real verification with screenshots only.
8. Browser proof

Launch the combined external application.

Verify through the browser that:

the left selected feature is present and functional;
the right selected feature is present and functional;
baseline application behaviour still works;
unrelated branch changes are absent;
there are no visible runtime failures;
there are no relevant console errors;
the candidate is running from its own isolated worktree and process.

Capture evidence screenshots under a new folder such as:

docs/evidence/prompt-008/

At minimum capture:

both external source branches running in UI Merge Studio;
selected source evidence;
candidate plan or dependency evidence;
combined external result;
verification summary.

Do not commit large, redundant, or accidental screenshots.

9. Determinism and idempotence

Run candidate generation a second time using the same:

base;
source branch commits;
selection identities;
analyzer schema;
candidate name or deterministic equivalent.

Prove one of these acceptable outcomes:

the existing equivalent candidate is recognised as idempotent success; or
a regenerated candidate produces the exact same tree.

Report:

git rev-parse <candidate>^{tree}

and any equivalent tree comparison used.

The result must not depend on timestamps, random ordering, unstable import ordering, or manual cleanup.

10. Source-branch preservation

After generation, verify that:

left branch commit is unchanged;
right branch commit is unchanged;
base commit is unchanged;
no source worktree is dirty;
no branch was force-moved;
no source files were manually edited in their original checkout.

Report exact before-and-after commit hashes.

11. Cleanup

Stop all preview and candidate processes.

Verify:

managed ports are free;
temporary preview worktrees are removed;
temporary candidate worktrees are removed unless intentionally retained for manual review;
no stale Git worktree registrations remain;
runtime reports are stored only in ignored paths;
the UI Merge Studio repository is clean except for intentional Prompt 008 changes;
the external source repository is clean;
candidate branch state is clearly documented.

Do not claim cleanup without checking:

git worktree list
git status --short

and relevant process/port state.

Failure-Path Requirement

This milestone must include at least one real failure-path test.

Use a bounded external incompatibility such as:

conflicting edits to the same declaration;
incompatible import aliases;
ambiguous mixed-file ownership;
unresolved dynamic dependency;
inseparable unrelated modification.

The failure case must demonstrate:

compatibility analysis occurs before mutation where possible;
no successful candidate commit is created;
the reason is explained using source evidence;
source branches remain unchanged;
temporary resources are cleaned up.

Do not manufacture a fake refusal by checking a branch name or visible label.

If creating a failure fixture would materially expand scope, use an existing unsupported pattern and test it directly.

Scope Constraints

Do not add:

Next.js support;
FlowCraft integration;
cloud execution;
Railway execution;
Vercel backend execution;
GitHub OAuth;
remote repository cloning workflows;
collaboration;
billing;
arbitrary repository setup wizard;
monorepo support;
backend-service merging;
AI merge authority;
a generic coding-agent interface;
broad visual redesign;
unrelated product features.

Do not reopen the controlled fixture’s visual design.

Do not redesign the homepage or comparison workspace unless a concrete Prompt 008 defect blocks validation.

Do not change the project name.

Engineering Rules
Inspect existing code before editing.
Preserve existing controlled behaviour.
Prefer the smallest reviewable implementation.
Add happy-path and failure-path tests.
Do not rewrite working subsystems without evidence.
Do not weaken existing types.
Do not disable or delete tests to obtain a pass.
Do not swallow errors.
Do not hard-code expected success.
Do not fake runtime evidence.
Do not manually edit the final candidate to make it pass.
Do not let generated files or temporary worktrees leak into Git.
Keep deterministic Git/AST/source analysis as the source of truth.
An LLM may help explain an error, but it must not authoritatively decide or produce the merge.
Commit only after verification.
Use coherent commits with accurate messages.
Do not push to GitHub unless explicitly instructed after review.
Required Tests

At minimum, add or update tests covering:

Unit/integration tests
external repository configuration;
external source-selection identity validation;
dependency slice extraction for both selected declarations;
direct dependency inclusion;
transitive dependency inclusion where present;
unrelated-change exclusion;
import reconciliation;
exact-base candidate planning;
deterministic candidate tree;
stale commit refusal;
dirty repository refusal;
unsupported ownership refusal;
cleanup after success;
cleanup after failure.
End-to-end proof

Add a focused Playwright scenario that:

starts both external branches;
confirms separate worktrees/processes;
performs rendered selections;
resolves source evidence;
runs analysis;
confirms expected included and excluded changes;
generates the external candidate;
waits for verification;
launches the combined result;
confirms both selected visible features;
confirms unrelated visible changes are absent where applicable;
stops all processes;
confirms zero active sessions.

Do not make the E2E test depend on branch names for mapping logic.

Acceptance Criteria

Return PASS only if all of the following are proven:

external branch selections originate from the rendered UI;
both selections resolve generically to exact source;
dependency slices are produced from Git and AST evidence;
direct and transitive dependencies are included as required;
unrelated branch edits are excluded;
compatibility planning occurs before mutation;
candidate branch is created from the exact common base;
no broad merge or cherry-pick is used;
imports and declarations are reconciled deterministically;
external typecheck passes;
external tests pass;
external production build passes;
combined external app launches;
both selected features are visible and functional;
baseline behaviour remains intact;
source branches remain unchanged;
repeated generation is deterministic or idempotent;
success and failure paths are tested;
cleanup succeeds;
no repository-specific mapping hard-coding is introduced;
controlled fixture tests remain green;
UI Merge Studio typecheck and build remain green.
MODIFY Conditions

Return MODIFY if:

the visual selections and source mappings remain valid;
the deterministic approach remains plausible;
but a bounded real-world pattern blocks completion, such as:
an unsupported static re-export;
a resolvable alias;
a mixed import edge;
a test-layout pattern;
a bounded stylesheet ownership case;
a deterministic ordering defect.

For MODIFY, report:

exact blocking pattern;
smallest required change;
files affected;
why the approach remains viable;
next bounded prompt;
what has still been proven.

Do not broaden the product merely to avoid MODIFY.

ABANDON Conditions

Return ABANDON for external candidate generation if any of these are true:

successful output requires merging or cherry-picking whole branches;
visual selection does not meaningfully constrain included code;
every feature needs a manual file list;
the candidate only works after manual source editing;
repository-specific component hard-coding is required;
unrelated edits cannot be excluded reliably;
source mapping and dependency analysis diverge materially;
an LLM must decide the actual merge;
verification passes only after weakening tests or types;
output is nondeterministic;
failures cannot be explained with source evidence.

An ABANDON verdict applies to this approach or milestone, not automatically to the entire UI Merge Studio project.

Documentation Requirements

Update or add:

docs/completion-report-008.md
docs/evaluation.md
docs/decision-log.md
docs/risk-register.md
docs/limitations.md
docs/codex-prompts/008-external-vite-candidate-generation.md
docs/evidence/prompt-008/

Only modify documentation when supported by observed evidence.

Update the README evidence matrix only if the milestone passes.

Do not claim:

universal Vite support;
arbitrary React support;
production readiness;
Next.js support;
FlowCraft integration;
cloud execution;
guaranteed safe merging.
Required Completion Report

At completion, provide a structured report with these sections.

1. Final verdict

One of:

PASS
MODIFY
ABANDON

Explain the verdict in plain language.

2. What was actually proven

Separate:

external rendered selection;
source mapping;
dependency slicing;
candidate planning;
candidate generation;
unrelated-change exclusion;
verification;
determinism;
cleanup;
refusal.
3. What remains unproven

List every meaningful limitation.

4. Initial repository state

For both repositories include:

branch;
commit;
cleanliness;
worktrees;
relevant ports/processes.
5. Final repository state

For both repositories include:

branch;
commit;
cleanliness;
worktrees;
candidate branch;
remaining processes;
remaining temporary paths.
6. Files changed

List every UI Merge Studio file changed and why.

List any external validation-repository files changed and why.

Distinguish:

product implementation;
tests;
validation fixtures;
evidence;
documentation.
7. Candidate provenance

For every changed candidate file, report:

source branch;
selected feature or dependency reason;
included declaration or whole-file evidence;
excluded unrelated changes.
8. Commands executed

List every important command exactly.

9. Test and verification results

Report:

UI Merge Studio typecheck;
UI Merge Studio tests;
controlled fixture verification;
external tests;
external typecheck;
external build;
Playwright results;
runtime result;
determinism result.

Include passed/failed counts where available.

10. Architecture decisions

Explain:

changes made;
alternatives rejected;
why the implementation remains deterministic;
why it is not broad branch merging;
how visual selection constrains the candidate.
11. Assumptions

List assumptions explicitly.

12. Limitations and unresolved risks

Be adversarial.

Call out:

repository-specific validation-fixture characteristics;
unsupported dependency patterns;
scalability concerns;
test-runtime concerns;
worktree/process risks;
false-positive and false-negative risks;
anything a sceptical senior engineer would challenge.
13. Manual verification instructions

Provide exact commands and browser steps for Varunraj to reproduce:

launch;
selection;
analysis;
candidate generation;
verification;
combined result;
refusal;
cleanup.
14. Commit recommendation

Recommend exact commit boundaries and commit messages.

Do not commit or push without clearly reporting what will be included.

Final Review Questions

End the completion report by answering:

What has actually been proven?
What remains assumed?
What is fake, hard-coded, or validation-repository-specific?
What would a sceptical senior engineer challenge?
What would a recruiter understand within five seconds?
Does UI Merge Studio still deserve flagship status?
What is the smallest next experiment?

Do not write marketing language in place of evidence.

Final Instruction

The milestone succeeds only if a user’s external rendered selections genuinely constrain a deterministic, dependency-aware, verified candidate branch.

A compiling branch alone is insufficient.

A visually impressive demo alone is insufficient.

A broad Git merge disguised as visual integration is a failure.

Correct refusal is better than a broken or dishonest candidate
