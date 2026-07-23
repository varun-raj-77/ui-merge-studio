# Prompt 006 performance evaluation

## Environment and method

- Date: 2026-07-23
- Platform: Windows, Node 20.20.2
- Browser: Playwright Chromium
- Viewport: 1440×900
- Fixture: generated local Support Dashboard
- Timing boundary: click to both validated `preview-ready` bridge events
- API duration: browser request start to response

## Baseline

| Measurement | Baseline |
| --- | ---: |
| Cold dual readiness | 24.037 s |
| Warm dual readiness | 21.813 s |
| Single right restart | 16.615 s |
| Left/right launch POST duration | 22.329 / 22.331 s |
| Preview launch POST count | 2 |
| Preview status poll count | 0 |
| Duplicate/overlapping launch count | 0 |

The baseline had no preview-status polling implementation; POST itself awaited all work. The reported “repeated polling” symptom was therefore not reproducible on the starting commit. The duplicate repository request seen in development came from React Strict Mode and was unrelated to preview launch. The root pending cause was the synchronous server handler awaiting ref resolution, worktree creation, `npm ci`, process spawn, and HTTP readiness.

## Improved implementation

| Measurement | Improved |
| --- | ---: |
| Cold dual readiness | 18.123 s |
| Warm dual readiness | 3.807 s |
| Single right restart | 4.027 s |
| Click to first launch acknowledgement | 99 ms |
| Left/right POST duration | 2 / 19 ms |
| Cold operation polls, both slots | 50 |
| Warm operation polls, both slots | 16 |
| Warm single-restart polls | 25 |
| Longest measured status request | 37 ms |
| First truthful operation feedback | within the 99 ms acknowledgement interval |
| Overlapping polls | 0 |

Cold readiness improved by running the two isolated slots concurrently with `npm ci --prefer-offline` and explicit phases. Warm readiness and restart improved by safely reusing only the same slot’s exact-commit detached worktree and prepared dependencies. The measured warm right-slot restart acknowledged in 85 ms and reached ready in 4.027 seconds. API responsiveness improved because launch became an acknowledged operation.

## Interpretation

The controlled targets are met on this machine: acknowledgement under 1 second, cold dual readiness under 20 seconds, and warm dual readiness under 10 seconds. The measurements are evidence, not universal guarantees. Cold launch remains dependent on disk, npm cache, antivirus, CPU, and fixture dependency state. Poll count is intentionally higher than the synchronous baseline because polling now exists; correctness is established by bounded backoff, no overlap, terminal stop, cancellation, and stale-operation rejection.
