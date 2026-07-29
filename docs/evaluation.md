# Engineering evaluation

## Controlled engine

The controlled React/TypeScript/Vite proof covers isolated worktrees, live preview synchronization, rendered React mapping, dependency-aware feature slicing, unrelated-change exclusion, deterministic candidate generation, idempotence, verification, and refusal before unsafe mutation.

## External Vite evidence

One unrelated Vite repository was validated from exact base `8223897`. Two independent feature branches launched, mapped rendered elements to their real declarations, generated a six-file candidate from the common base, passed install, TypeScript, lint, production build, and runtime checks, and reproduced the same candidate tree. The repository had no application test script, so this does not prove external test slicing.

## Hosted Product Catalogue

The public sample keeps the baseline visible beside the focused branch, starts with an empty selection tray, supports arbitrary select/deselect ordering, derives evidence from a typed selection model, and distinguishes interactive behavior from committed engine evidence.

The recorded valid pair combines the category sidebar and quick-view inspector while excluding the promotion and sorting changes. The recorded incompatible pair detects the numeric-versus-string `Product.id` contract conflict before mutation. Unrecorded combinations are not presented as successes.

Current browser coverage includes compact landing viewports, desktop comparison, mobile comparison, sidebar collapse/expand, category filtering, inspector open/close and Escape behavior, exact highlight/control containment, safe combination, exclusion evidence, refusal, and unrecorded-result honesty.
