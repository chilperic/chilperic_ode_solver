# Foko Lab v72.47.0 — Professional Platform Audit

## Scope

This audit uses v72.46.0 as the stable baseline. It checks the Sensitivity runtime against its menus and public claims, then reconciles Docs, Tutorial, Trust, the capability registry, navigation copy, browser workload limits, responsive layout, render lifecycle, release identity and local runner. It does not certify arbitrary user models or claim parity with desktop or server sensitivity packages.

## Confirmed gaps in v72.46.0

Three feature gaps were reproducible:

1. The Morris trajectory option displayed scalar output along a path but did not show the normalized parameter path itself.
2. Global variance analysis reported time-resolved effects for the selected state but lacked a parameter-by-state first/total summary.
3. The bounded two-parameter response surface was implemented only in Local mode, so it appeared absent from Global variance analysis.

The audit also confirmed that the public Docs lagged the runtime, Tutorial contained no complete Sensitivity exercise, and Trust did not enumerate the current Sensitivity capabilities or conditional plot rules.

## Runtime corrections

### Morris design evidence

Every Morris path now retains its normalized parameter coordinates. The lab exposes two different plots:

- normalized parameter-design trajectories, for inspecting the OAT design;
- scalar output along the computed paths, for inspecting the response.

Only a bounded subset of trajectories is drawn when many are requested; all trajectories still contribute to the statistics.

### State-resolved global effects

The existing seeded Jansen A/B/mixed design is reused to calculate the selected scalar metric for every state. New heatmaps report parameter-by-state first-order and total-order estimates. These are derived from the same finite design, not independent replications.

### Global response surface

The optional bounded two-parameter grid is now available in Local and Global variance modes. The workload is included in the pre-worker capacity estimate and repeated in worker validation. All nonselected parameters remain fixed at nominal values, so this is a conditional response surface rather than a variance decomposition.

### Conditional discoverability

The lab now explains which plots become available after Local, Morris, Global variance or FIM computation. Second-order, dependence and response-surface views are identified as option-dependent and require a fresh run after enabling the option.

## Documentation and Trust reconciliation

The following surfaces now agree with the runtime and capability taxonomy:

- `docs.html` and `USER_GUIDE.md`;
- `tutorial.html` and `TUTORIALS.md`;
- generated `trust.html` and `CAPABILITIES.json`;
- JSON/Markdown analysis taxonomy;
- static and runtime navigation descriptions.

Tutorial 10 walks through local Jacobians, OFAT, directional and response-surface evidence, Morris design inspection, global first/total/time/state effects, optional second-order interactions, limited MI/HSIC screening, stale-result ownership and browser-capacity refusal.

## Additional consistency defects corrected

The audit found and corrected three release-quality defects:

- the Trust generator emitted an empty static navigation placeholder; it now reuses the canonical six-destination public navigation and remains usable before JavaScript;
- Trust exposed the internal token `derived-browser` and damaged scientific acronyms; it now displays “Derived in browser” and preserves ODE, SSA, FIM, HSIC and related acronyms;
- the local runner’s embedded preflight still checked v72.45.0 as the predecessor; both runner predecessor checks now use the actual immediate predecessor, v72.46.0.

A release-blocking consistency audit now checks these conditions.

## Numerical and lifecycle findings

The audit confirms:

- one deterministic ODE integration engine remains the sole ODE owner;
- user equations, initial conditions, parameter values/ranges, time span, solver settings and tolerances reach the Sensitivity worker;
- capacity estimates include local refinement, OFAT, directional profiles, Local/Global surface grids, Morris designs, first/total/second-order matrices, stored state-time values and dependence permutations;
- oversized requests are refused before worker creation and revalidated inside the worker;
- changing scientific inputs marks evidence stale and blocks result/image export until rerun;
- all 14 scientific workspaces retain two stable plot hosts and one Plotly lifecycle owner;
- plot selection does not mutate explicit Two-up or Focus intent.

## Reliability verdict

The implemented Sensitivity paths are suitable for bounded exploratory analysis, teaching, model screening, comparison of outputs and reproducible export. They are not convergence certificates, causal analyses, dependent-input decompositions, adjoint calculations or replacements for high-budget external validation. No remaining reproducible platform inconsistency justified changing the stable numerical cores.
