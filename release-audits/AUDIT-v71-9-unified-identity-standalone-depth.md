# V71.9 — unified identity and standalone lab depth framing

## Why this release exists

V71.8 preserved the shell migration and the recovered legacy pages, but the homepage creator block regressed: the creator card showed only the platform mark, so the human identity from the separately developed home/creator lineage was lost. The documentation also failed to explain why the standalone labs remain necessary and powerful while the Workbench exists.

## Strengths retained from the separate home/identity lineage

- Creator identity is visible again through `assets/profile-chilperic.webp`.
- The homepage keeps the platform-first framing but restores the creator photo inside the creator card.
- The platform mark is retained as a secondary badge rather than replacing the person.
- Research, CV and personal-site routes remain available under the Creator menu.

## Standalone lab policy

The standalone ODE, Stochastic, Optimization and Steady-State pages are not redirects and not placeholders. They are focused scientific workspaces. The Workbench is the integrated route; standalone labs are deeper single-paradigm control surfaces.

## What changed

- Restored the creator photo on the homepage creator card.
- Added a homepage section explaining why standalone labs are kept.
- Added a documentation section defining the standalone-lab standard and missing scientific depth.
- Added a lightweight per-page scientific power brief to `ode.html`, `stochastic.html`, `optimization.html` and `steady.html`.
- Preserved existing controls and scripts for every lab.
- Bumped tokens to `?v=71.46.0`.

## What was deliberately not changed

- No legacy page was descriptor-ported.
- No legacy page was redirected.
- No solver engine was modified.
- No runtime event binding was changed.

## Validation

- Pytest structural suite.
- Existing Node science tests.
- JavaScript syntax checks across `src/`, `src/core/`, `src/platform/`, `src/labs/` and `src/stochastic/`.
