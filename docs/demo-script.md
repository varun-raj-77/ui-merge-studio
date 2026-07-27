# Prompt 006C controlled product-shell demo

1. Run `npm run fixture:verify`, then `npm run dev` and open `http://127.0.0.1:4310`.
2. On the overview, identify the generic product promise, the honest arbitrary-repository limitation, the fictional Sample Support Dashboard, the two experiment branches, and the verified result.
3. Choose **Try sample demo**. Point out that each panel is the complete live application from one Git branch, not a screenshot or code excerpt.
4. Open TCK-102 in either version and show that the other version follows the ticket and route.
5. In the Navigation experiment, choose a feature, activate the sidebar collapse control, review the compact inclusion/exclusion summary, and confirm **Collapsible navigation**.
6. In the Activity-filter experiment, choose TCK-102, choose a feature, activate **note**, and confirm **Activity filters**.
7. Confirm the persistent tray names both selected features and says the safety checks found no conflicts. There is one primary **Create verified branch** action.
8. Create the branch. Narrate the real changing stages: isolated workspace, each selected feature, changed-file check, install, typecheck, tests, focused tests, build, tree/commit, and cleanup.
9. Open the verification summary, then **View combined app**. Use the three result tabs to compare both sources with `combined-result`; demonstrate both features together and the unrelated heading/sorting exclusions.
10. Use a contextual evidence link to show operation timings, source identities, Git/AST inclusion/exclusion evidence, test-unit slicing, and downloadable artifacts. Press Escape to close it.

Use **Side by side**, **Focus navigation branch**, and **Focus activity branch** without horizontal dragging. Use **Back to overview**, then **Resume sample demo**, to prove state is preserved without duplicate previews. No DevTools or external coaching is required.

For the safety proof, choose the ticket-page heading instead of the prompted navigation control. The card must explain that the area is broader than the guided demo can safely verify, keep branch creation disabled, and direct the user to choose the focused feature. For a verification failure, the primary UI must say that no branch was created and offer **Change selected features**; raw command output belongs only in the collapsed technical details.

## Prompt 005 technical fallback

1. Run `npm run fixture:verify`, then `npm run dev` and open `http://127.0.0.1:4310`.
2. Launch `branch-sidebar` and `branch-inspector` together.
3. Select `AppSidebar` on the left and `ActivityFilters` on the right; analyze both and confirm both schema-v2 artifacts are resolved.
4. In **Candidate generation**, confirm the two analysis IDs, exact base, and `combined-result`; prepare and inspect the plan summary.
5. Generate. Observe validate, plan, transform, verify, and commit; inspect the changed-file audit and five passed gates. Download the JSON report.
6. Generate again and confirm the same commit/tree is idempotent.
7. Launch the candidate. Collapse/expand the sidebar, open TCK-102, select the status filter, and confirm `No status activity found.` Confirm the heading is `Support Tickets` and ticket order is TCK-102, TCK-103, TCK-104.
8. Inspect `git diff main...combined-result`, the one candidate commit, reconstructed `src/test/inspector.test.tsx`, absence of `src/utils/sortTickets.ts`, and unchanged source refs.
9. Restart one source preview and confirm generation is invalidated until re-analysis.
10. Run the controlled conflict test and inspect its file, declaration, slice IDs, evidence, reason, and manual resolution guidance.

Primary evidence is the Git tree/diff, report, verification output, tests, and runtime behavior; screenshots are supplementary.

## Prompt 007 falsification demonstration

1. Show FlowCraft at `261ab0f`: Next.js 14 frontend, React Flow canvas, Zustand stores, Socket.IO execution updates, Express/MongoDB backend, and passing native checks.
2. Show the UI Merge Studio preview controller executing `node_modules/vite/bin/vite.js`, the Vite-only instrumentation plugin, fixed `/tickets` readiness probe, and support-ticket capability detector.
3. State the causal stop clearly: without a live instrumented FlowCraft element, there is no valid source seed, dependency slice, exclusion proof, or candidate plan.
4. Confirm no FlowCraft refs or files changed and no `ui-merge/flowcraft-combined` branch exists.
5. In the controlled demo, show the non-obstructing sticky action dock, grouped preview controls, and generated **Sample Support Desk** / **Demo application · Fake ticket data** branding.
# Prompt 011 public demo script

1. On the landing page, read the one-sentence definition and point out the hosted-replay/local-engine boundary.
2. Choose **Explore the verified demo**.
3. Compare the shared baseline with Branch A's outlined collapsible navigation and Branch B's outlined activity filters. No selection occurs here.
4. Continue to Select. Add Branch A and observe the Result Preview gain navigation; add Branch B and observe activity filters appear; remove and restore either choice.
5. Review the integration plan. Show the React boundary, source file, dependencies and their reasons, explicit unrelated exclusions, shared base, compatibility, and `combined-result`.
6. Approve candidate generation. State that the hosted page is replaying a deterministic local run, then inspect each recorded gate individually.
7. Open the result and compare baseline with the final selected feature set. Inspect included and excluded paths and follow the candidate evidence link.
8. Use Back to plan and Back to selections to revise without changing selections accidentally. Restart clears the demo.

The exact public claim is: “This hosted experience demonstrates the product workflow and replays committed source-integration evidence; local mode performs the actual repository operations.”
