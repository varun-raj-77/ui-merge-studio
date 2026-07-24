# Prompt 006B guided demo script

1. Run `npm run fixture:verify`, then `npm run dev` and open `http://127.0.0.1:4310`.
2. On the introduction screen, identify the product promise, the fictional Sample Support Dashboard, the two experiment branches, the verified result, and the examples beyond navigation and filters.
3. Choose **Start guided comparison**. Point out that both cards immediately show truthful phases while the launch API has already acknowledged the operations.
4. Open TCK-102 in either version and show that the other version follows the ticket and route.
5. Choose **Choose a feature** in Version A, then activate the sidebar collapse control. Confirm **Collapsible Sidebar** appears automatically.
6. In Version B, choose TCK-102, choose a feature, and activate **note**. Confirm **Activity Filters** appears automatically.
7. Confirm the persistent tray names both selected features and says the safety checks found no conflicts. There is one primary **Create verified branch** action.
8. Create the branch. Narrate the real changing stages: isolated workspace, each selected feature, changed-file check, install, typecheck, tests, focused tests, build, tree/commit, and cleanup.
9. Open the verification summary, then **Open verified result**. Demonstrate the collapsible sidebar and activity filters together.
10. Open **Technical details** and show operation timings, source identities, eligible ancestors, Git/AST inclusion/exclusion evidence, test-unit slicing, and downloadable artifacts. Press Escape to close it.

Use **Both**, **Focus A**, and **Focus B** to inspect the previews without horizontal dragging. The happy path needs five primary product clicks after the introduction: choose Version A, choose Version B, create, expand verification, and open the result. Interactions inside the sample previews are feature targets, not product navigation. No DevTools or verbal explanation of source files is required.

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
