# Minimal AI-agent baseline

Execution was deferred. Running a merge agent would not be a fair comparison because UI Merge Studio could not launch or instrument FlowCraft under the allowed scope, and no valid validation branches were created.

## Exact future protocol

Use one fresh FlowCraft clone at the exact validation base and give Codex this single task:

> Combine the execution-inspector feature from branch `flowcraft-inspector-variant` and the canvas-replay feature from branch `flowcraft-replay-variant`. Exclude unrelated changes and run verification.

Record without prompt optimization:

- clarifications requested;
- elapsed time;
- changed declarations/files;
- dependencies included or missed;
- intentionally unrelated edits included;
- typecheck, focused tests, full tests, build, and runtime result;
- whether failure produces a precise refusal before branch acceptance;
- reproducibility from the same base;
- explanation quality and provenance.

Do not execute this benchmark until those branches exist independently of UI Merge Studio and the Next.js runtime adapter can establish the same visual selections.
