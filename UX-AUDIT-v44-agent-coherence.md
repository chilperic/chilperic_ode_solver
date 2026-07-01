# UX audit v44 — Agent coherence and Workbench routing

## Critical finding
Agent Lab was mixing model context and plot context. The T-cell model could still show a FADNS-specific diagnostic title because plot modes were global and not filtered by the selected model. That is a domain-coherence failure, not a cosmetic issue.

## Fixes
- Workbench dropdown is now the complete modeling gateway: Model Bench, ODE, Optimization, Steady-State, Stochastic, Symbolic, Agent, Model Atlas.
- The Legacy dropdown was removed from the public navigation. ODE/Optimization/Steady-State/Stochastic are first-class modeling approaches, not hidden secondary routes.
- Homepage now exposes all major modeling routes as compact cards.
- Workbench now includes a compact approach-comparison map across the modeling engines.
- Agent plot controls moved into the Diagnostic plots card, next to the plot itself.
- Agent plot modes are now model-aware. FADNS-specific plots are only available for the FADNS particle model.
- Agent plot palette is visible in the diagnostic context and affects canvas, legend, and Plotly traces.
- Plotly diagnostics now include an explicit no-trace fallback and resize call.

## Remaining critique
- The Agent Lab is now coherent, but still too vertically long. A later version should convert run settings and custom editors into a right-side drawer or modal.
- Workbench still has two meanings: a dashboard route and an execution surface. This is acceptable for now but should eventually become a true dashboard with direct launch cards and saved sessions.
- Plot export from Agent Lab is still missing.
