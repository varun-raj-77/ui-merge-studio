# Prompt 005 demo script

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
