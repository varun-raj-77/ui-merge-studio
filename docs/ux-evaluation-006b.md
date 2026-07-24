# Prompt 006B product-experience correction

## Verdict

**PASS for the controlled Phase 0 demonstration.**

The first screen now explains what UI Merge Studio builds before starting previews. It identifies the support dashboard as fictional sample content, shows the shared-start/experiment/result branch relationship with friendly labels, describes the two example targets, and names broader kinds of visible React features.

The comparison workspace now uses a high-contrast developer-product visual system, explicit Both/Focus A/Focus B layouts, selection prompts above each preview, and persistent guided status. The preview shell and sample application are responsive without required horizontal dragging at 390, 768, or 1200 pixels.

## Safety and failure behavior

- The focused guided targets are the collapsible navigation and `ActivityFilters`.
- A broader rendered target is stopped before candidate creation and directs the user to choose the narrower example.
- A failed verification states that no branch was created, both originals are unchanged, and temporary work was cleaned up.
- Candidate creation is removed after failure; **Change selected features** is the recovery action.
- Raw refs, source details, and command output are progressively disclosed rather than used as primary product copy.

## Evidence

- [Introduction at 1280 × 720](evidence/prompt-006b/intro-1280x720.png)
- [Introduction at 1440 × 900](evidence/prompt-006b/intro-1440x900.png)
- [Introduction at 1920 × 1080](evidence/prompt-006b/intro-1920x1080.png)
- [Comparison workspace at 1440 × 900](evidence/prompt-006b/comparison-1440x900.png)

Automated proof covers the pre-preview introduction, guided target refusal, candidate success and failure, synchronized previews, source mapping, responsive overflow, full engine regressions, type checking, production build, and fixture integrity.

## Preserved boundary

This correction does not add arbitrary repository onboarding, cloud execution, authentication, collaboration, billing, new frameworks, monorepo support, an IDE, or a new merge engine.
