# Foko Lab v26 — model contract and professional release blockers

Implemented the v26 hardening pass from the deep audit:

- fixed Steady-State unclosed label and side navigation jumps;
- added Steady-State Python root/fsolve export;
- added worker error handling and kept the ODE worker alive between runs;
- memoized equation compilation for vector fields;
- replaced raw JSON diagnostics with a structured table in ODE/Optimization Lab;
- moved plot redraws toward Plotly.react rather than full DOM replacement;
- added a shared model validator and session helper;
- added ODE → Symbolic and ODE → Steady-State handoff buttons;
- unified CSS cache token to ?v=2.7.4;
- replaced docs/tutorial hardcoded white cards with theme variables;
- populated platform.html with the model-routing contract;
- added Plotly preload hints and HiDPI Agent canvas scaling.

Remaining deferred work: full Playwright browser tests, mobile hamburger/dropdown navigation, deep graph visualization for Agent Lab, true multi-worker ODE sweeps, full structured editor sync in Stochastic Lab, and expanded peer-ready research detail pages.
