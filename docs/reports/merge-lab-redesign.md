# Prompt 013 completion report

## 1. Files inspected

The inspection covered the Showcase entry point, component and CSS architecture, Vite/Vercel routing, generated manifest and sanitized report, all four compiled artifact trees, source/dependency/exclusion records, candidate verification, comparison capability logic, fixture capability detection, existing unit and Playwright coverage, and the public product/evidence documentation. The preserved stash was not inspected or changed.

## 2. Existing architecture discovered

Production selected Showcase Mode in `main.tsx`; the prior Showcase was a single component with an in-memory staged walkthrough and multiple simultaneous iframes. Run `3788f05dfefcd572` already supplied hash-validated baseline, Branch A, Branch B, and combined-result artifacts plus source slices, exclusions, commits, and five passing gates. Refusal was not part of that report: `branch-incompatible-route` separately proved incompatible preview route contracts.

## 3. Design decisions made

The public product is now a five-second landing page plus a focused Merge Lab. Landing mounts no application. The Lab mounts one large active artifact, keeps selection controls in the parent, progressively discloses technical evidence, and reveals the actual compiled candidate only after both recorded selections. History-backed state replaces the old staged slideshow. The optional refusal remains explicitly separate from the successful run.

## 4. Files changed

- Product: `apps/studio/index.html`, `apps/studio/src/ShowcaseApp.tsx`, `apps/studio/src/showcase.css`, `apps/studio/src/showcaseRefusal.ts`
- Artifact containment and hosting: `apps/studio/public/showcase-frame.html`, `apps/studio/vite.config.ts`, `vercel.json`
- Social preview: `apps/studio/public/og.png`
- Tests: `tests/studio/ShowcaseApp.test.tsx`, `tests/preview-runtime/fixtureAdapter.test.ts`, `tests/e2e/showcase-evidence.spec.ts`
- Documentation: `README.md`, `docs/product-brief.md`, `docs/decision-log.md`, `docs/limitations.md`, `docs/evaluation.md`, `docs/demo-script.md`, `docs/risk-register.md`, and this report
- Evidence: 16 PNGs under `docs/evidence/merge-lab-redesign/`

Generated report, manifest, compiled run artifacts, fixture source, engine packages, and merge algorithms were not changed.

## 5. Components added or refactored

The Showcase is decomposed into `LandingVisual`, `Landing`, `Preview`, `SourceTrace`, `CompositionTray`, `IntegrationProof`, `Verification`, `UnsafeChallenge`, and `MergeLab`. `showcaseRefusal.ts` isolates the narrow capability comparison. `showcase-frame.html` safely replays allowlisted artifacts at `/tickets`.

## 6. Exact final user journey

Read the proposition, open the Lab, inspect Version A/B/Baseline, select Focus Mode, inspect its source, select Activity Lens, inspect its source, review the 2/2 tray, build the recorded result, inspect inclusion/exclusion, interact with both combined behaviors, open verification and handoff, then optionally test the incompatible route pairing. Back/forward, refresh, exit, and Restart preserve or reset state predictably.

## 7. Visible selection to source evidence

Parent controls select the visible `AppSidebar` and `ActivityFilters` boundaries. `SourceTrace` reads their branch, commit, declaration, analyzed boundary, and source file from the generated Showcase manifest; public component names never drive analysis.

## 8. Dependency evidence

Each source card shows its generated supporting-file count and exposes every exact supporting path and analyzer reason on demand. The integration tree repeats bounded supporting paths for the two selected slices: five for Focus Mode and nine for Activity Lens.

## 9. Unrelated-change exclusion

The integration proof explicitly separates included from excluded work. It shows the Version A Operations Command Center heading and Version B newest-first sorting (`src/utils/sortTickets.ts`) as excluded, matching the recorded feature slices and candidate artifact.

## 10. Combined result presentation

The payoff uses the real prebuilt `combined-result` artifact at commit `ede2b13e9b5016b1abcabfd4996ece6d52ed138c`. A visitor can collapse/expand navigation and filter activity between note and email. The replay shell prevents the artifact’s `/tickets` history rewrite from recursively loading the outer SPA.

## 11. Supported verification claims

The report records five passed gates: install, TypeScript, full fixture tests, focused feature tests, and production build. The public panel deliberately promotes four developer-facing checks—TypeScript, full tests, feature tests, and build—and exposes their real commands and evidence references.

## 12. Claims intentionally omitted

The UI does not claim hosted Git execution, fresh candidate creation, accessibility certification, runtime or visual-diff gates, pull-request creation, repository mutation, universal React support, Next.js support, security guarantees, or production readiness.

## 13. Refusal path

The safety challenge compares `ticket-query-v1` with `ticket-path-v1` through the real `compareCapabilities` logic and reports: “Preview synchronization refused” and “No candidate was attempted or created.” A focused test derives both contracts from the actual generated `branch-sidebar` and `branch-incompatible-route` source. This is preview-synchronization evidence, not candidate-generator refusal.

## 14. Real generated evidence

Run `3788f05dfefcd572` provides base `cccd7116646d0cc59d4795478e1783580c249966`, Branch A `2b5365a560eb0867f33ff73a29da579a7eca099b`, Branch B `3e7249400d6fa2e08336b7fff308c794af53aecd`, candidate `ede2b13e9b5016b1abcabfd4996ece6d52ed138c`, the two slices, 14 supporting files, four excluded symbols, five gates, artifact paths, and hashes.

## 15. Replayed presentation behavior

Feature labels, boundary callouts, composition state, the integration diagram, disclosure controls, and the optional safety challenge are authored presentation around immutable evidence. The browser replays already executed work and never invokes Git or verification.

## 16. Accessibility work

The redesign adds semantic buttons, an ARIA tablist/tabpanel with roving focus and arrow/Home/End behavior, non-color selection marks, visible focus, meaningful iframe titles, reduced-motion handling, parent-authoritative selection, branch iframe removal from the primary tab order, focus transfer after Build, and an actual Tab/Shift+Tab/Arrow-key Playwright journey.

## 17. Responsive work

Desktop uses one dominant readable preview and a decision rail. Mobile stacks the system, enlarges the artifact viewport instead of scaling it down, preserves primary controls, and simplifies graphs vertically. Manual review covered 1440×900, 1280×720, and 390×844; mobile document width equaled client width.

## 18. Performance risks addressed

Landing loads zero iframes; Lab mounts exactly one. Hidden artifacts are not mounted, keys remain stable per active version, history updates are outside React state updaters, reduced motion skips animation, and tests bound child-frame navigation. The replay wrapper avoids recursive SPA/frame loads.

## 19. Commands run

`npm run typecheck`; `npm run test:studio`; `npm run test:multi-preview`; `npm run showcase:validate`; `npm run build`; `npm run fixture:verify`; `npm run test:e2e -- showcase-evidence.spec.ts`; `git diff --check`; `git status --short`.

## 20. Exact test results

- TypeScript: passed
- Studio/bridge suite: 7 files, 38 tests passed
- Multi-preview capability/refusal suite: 8 files, 42 tests passed
- Showcase validation: run `3788f05dfefcd572` passed
- Production build: passed, 41 modules transformed
- Controlled fixture verification: passed
- Focused public Playwright: 8/8 passed in 35.1 seconds

The full cross-product Playwright suite was not practical for this presentation-only change: its other files drive local/external repositories and expensive candidate mutations. No test was skipped or weakened inside the focused scope.

## 21. Browser screenshots produced

`01-landing-hero.png`, `02-landing-source-tracing.png`, `03-merge-lab-version-a.png`, `04-focus-mode-selected.png`, `05-merge-lab-version-b.png`, `06-activity-lens-selected.png`, `07-composition-tray-complete.png`, `08-integration-graph.png`, `09-included-versus-excluded.png`, `10-combined-result.png`, `11-verification-evidence.png`, `12-developer-handoff.png`, `13-unsafe-refusal.png`, `14-mobile-feature-selection.png`, `15-mobile-combined-result.png`, and `16-mobile-refusal.png`.

## 22. Assumptions

The committed manifest/report remain the source of truth for the successful path. The controlled Support Desk artifacts are trusted same-origin static content. Vercel preserves query parameters through the exact `/tickets` rewrite.

## 23. Limitations

This remains one controlled React/TypeScript/Vite combination. The hosted site cannot operate on a visitor’s repository. The refusal proves route synchronization incompatibility only. Formal assistive-technology certification, a second device lab, and broader framework support remain outside scope.

## 24. Unresolved risks

Public GitHub links and the exact `/tickets` Vercel rewrite should receive a normal post-deployment smoke check because deployment was explicitly prohibited here. External Google-font delivery can fall back to system fonts. The retained fixture remains intentionally narrow.

## 25. Safe to publish

Yes, the local production artifact is safe to publish as a bounded interactive evidence replay. Generated evidence remains unchanged and validated. A post-deployment link/routing smoke check is still required.

## 26. Recommendation

**APPROVE**

No commit, push, deployment, fixture regeneration, engine rewrite, or stash operation was performed.
