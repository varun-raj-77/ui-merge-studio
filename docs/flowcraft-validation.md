# FlowCraft validation

## Repository inspected

- Path: `C:\Users\rekha\Documents\Codex\2026-07-15\files-mentioned-by-the-user-you\work\flowcraft-source`
- Commit: `261ab0f7c841278b0d68da7083955930980527fa`
- Branch: `main`, tracking `origin/main`
- State: tracked files clean; pre-existing untracked `work/` retained
- Package manager: npm with root, client, and server lockfiles

## Architecture and real commands

The frontend is Next.js 14 App Router with React 18, React Flow, Zustand, Tailwind, React Hook Form, Zod, and Socket.IO client. The backend is Express/TypeScript with Socket.IO, MongoDB/Mongoose, JWT cookies, and an execution DAG. The editor composes `WorkflowCanvas`, node configuration, and `ExecutionPanel`; execution and replay state live in Zustand.

Commands discovered and run:

- `npm run typecheck` — passed for client and server.
- `npm test` — passed: 104 client tests and 53 server tests.
- `npm run build` — passed: server TypeScript and Next.js production build.
- `npm run test:e2e --prefix client` — passed: five mocked deterministic browser journeys.

Local backend startup requires MongoDB and environment configuration. The existing browser suite honestly substitutes all `/api` calls with an in-memory Playwright adapter; it validates frontend behavior, not production backend integration.

## Branch assessment

No suitable source pair exists. The only local feature branch, `fix/first-party-auth-incognito`, is 48 commits behind `main`; deployment branches are also ancestors of `main`. Main already contains the execution inspector, inspector resizing, replay, node focus, and insights, so the existing branches cannot represent two independent feature variants.

No validation branches were created because UI Merge Studio cannot launch or instrument Next.js under the allowed scope.

## Decisive incompatibility

UI Merge Studio:

1. starts `node_modules/vite/bin/vite.js`;
2. injects source identity only through a Vite plugin;
3. waits for `/tickets`;
4. reads `src/state/ticketSelection.ts` for a support-ticket contract.

FlowCraft has no Vite configuration and uses Next.js. Prompt 007 forbids implementing Next.js support. As a result, neither FlowCraft branch can produce a valid instrumented visual selection. Source mapping, dependency tracing, unrelated-change exclusion, planning, generation, visual result, and causal-plan variation are therefore unproven.

## Outcome

**ABANDON.** This is not “PASS — bounded real-repository refusal,” because the product did not reach real source mapping or dependency analysis.
