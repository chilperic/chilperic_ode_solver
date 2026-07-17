# Foko Lab model and data input contract — v72.16.0

Foko Lab is a modeling platform, not a fixed gallery of examples. Curated presets are starting points. Computed claims are generated only from the current validated input.

| Lab | User-defined input | Local import | Boundary |
|---|---|---|---|
| ODE | variables, equations, parameters, initial conditions, time and solver settings | JSON, text, `foko.model-ir/1` direct ODE or reaction network, and supported model-oriented files | browser reference solvers; production stiff/DAE workflows require export |
| Steady State | variables, residual equations, parameters, starts, bounds and scans | JSON | finite multi-start root search is not root completeness |
| Stochastic | integer states, parameters, propensities and stoichiometric changes | model or session JSON | time-homogeneous direct SSA only |
| Optimization | variables, finite bounds, objectives, inequalities and equalities | model/configuration JSON | candidate search is not global-optimality certification |
| Statistics | local or pasted tabular data and role selection | CSV, TSV and text | inference is conditional on sampling, data quality and assumptions |
| Curve Fitting | local or pasted observations, weighting and fit model | CSV, TSV and text | local fit and local/asymptotic uncertainty are not identifiability proofs |
| Linear Algebra | matrix, optional vector, operation and tolerance | text, CSV, TSV or JSON | small dense matrices only |
| Networks | edge list, direction, weight meaning and analysis settings | text, CSV, edge-list or JSON | community/resilience outputs are algorithm-dependent diagnostics |
| Machine Learning | local table, feature/target roles, task, model and validation settings | CSV/TSV/text plus configuration JSON | validation estimates are finite-sample and not external validity |
| SciML | trajectory data or model text, workflow and noise seed | CSV, TSV, JSON, text or YAML-like model input | browser computation is limited; large neural/PDE workflows are export-only |
| Agent | exact state counts or fractions, topology, schedule, parameters, spatial snapshot count and custom rules | 20 curated presets, custom model JSON or full configuration JSON | custom rules are declarative and local; arbitrary code is not executed |
| Symbolic | variables, parameters, expressions, values and finite search range | expression text or configuration JSON | narrow parser/differentiator, not a general CAS |
| Workbench | full adapter configuration JSON | JSON | orchestrates shared cores; focused labs remain the detailed editors |

## Reaction-network input

The ODE Lab accepts a validated `foko.model-ir/1` reaction network and lowers it to direct equations through stoichiometry before numerical execution. This schema is intentionally smaller than SBML and does not represent units, compartments, events, algebraic rules, delays or DAEs. See `MODEL_IR_CONTRACT.md`.

## Reproducibility

A valid result export should include the release, validated configuration, seeds where relevant, algorithm, warnings and provenance. Saved/share states preserve configuration, not an unverifiable cached scientific claim. Results must be regenerated after import or restore.

## Input safety

Imported files are read locally in the browser. Agent custom models are validated against a fixed schema. They cannot execute JavaScript. Expression-based labs use restricted parsers and reject unsupported syntax rather than silently interpreting it.
