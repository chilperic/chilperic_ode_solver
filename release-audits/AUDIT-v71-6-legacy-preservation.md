# V71.6 legacy preservation repair

## Problem
The migration path incorrectly changed legacy/standalone lab behavior by redirecting non-ODE standalone pages to Workbench states and presenting the secondary menu as maintained Workbench routes. That made the legacy layer unavailable instead of preserving it while the shell migration proceeds.

## Correction
- Kept Statistics and Linear Algebra descriptor-shell ports.
- Preserved standalone `ode.html`, `stochastic.html`, `optimization.html`, and `steady.html` as real pages.
- Removed compatibility redirects from standalone Stochastic, Optimization, and Steady-State.
- Restored the secondary menu to `Standalone labs` with direct links to the standalone pages.
- Added regression tests that prevent future shell ports from deleting or redirecting legacy pages prematurely.

## Migration rule
Descriptor migration may only replace a legacy page after that specific page has a tested descriptor equivalent. Until then, the legacy page remains a compatibility surface.
