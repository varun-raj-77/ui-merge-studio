# Limitations

The fixture is controlled, small, local, React-only, and intentionally omits live services. It cannot establish generality. Browser execution depends on an installed Playwright Chromium binary. Commit SHAs can vary with timestamps.

The repository foundation alone did not prove source mapping. Prompt 002 adds controlled evidence for rendered function-component definition mapping, selection, and ancestor semantics; that evidence is limited to the documented patterns and fixture branches. It does not prove dependency extraction, exclusion of unrelated hunks, safe branch combination, incompatibility detection by UI Merge Studio, or the Phase 0 product claim.

The Prompt 002 experiment supports conventional function declarations, function expressions, and arrow components whose returned shape reaches a host root. Wrapper-only delegation is transparent. Direct host siblings in fragments are independently highlightable with shared definition identity and `partial` confidence; the experiment does not claim a single fragment rectangle. Dynamic factories, render props whose ownership is ambiguous, class components, portals, server components, compiled JSX outside the repository, and non-host custom roots without an eligible descendant are unsupported and must be refused or remain unselectable.

Instrumentation is development-only and tied to the pinned Babel/Vite transform pipeline. Metadata increases development DOM size and reveals repository-relative paths, but not machine-specific absolute paths. Windows uses process-tree termination and verified temporary-worktree cleanup. The work remains React/Vite-specific and does not prove later dependency or integration stages.
