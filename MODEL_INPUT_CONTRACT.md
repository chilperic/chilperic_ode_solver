# Foko Lab model and data input contract — v77.4.1

Foko Lab is a modeling platform, not a fixed gallery. Curated presets are editable starting points; computed claims are generated only from the current validated input.

| Workspace | User-defined input | Local import | Scientific boundary |
|---|---|---|---|
| Model Studio | identity, states, equations, initial conditions, parameters/ranges, time and solver settings | TXT/ODE, JSON/Model IR, Python or JavaScript data dictionaries, declarative YAML subset, model-table CSV, strict SBML reaction subset | deterministic ODE projects only; imported models must be rerun |
| ODE | variables, equations, parameters, initial conditions, time and solver settings | the same formats as Model Studio; optimization TXT remains accepted | browser reference solvers; production stiff/DAE workflows require export |
| Steady State | variables, residual equations, parameters, starts, bounds and scans | JSON | finite multi-start root search is not root completeness |
| Stochastic | integer states, parameters, propensities and stoichiometric changes | model or session JSON | time-homogeneous direct SSA only |
| Optimization | variables, finite bounds, objectives, inequalities and equalities | model/configuration JSON and optimization TXT | candidate search is not global-optimality certification |
| Statistics | local or pasted tabular data and role selection | CSV, TSV and text | inference is conditional on sampling, data quality and assumptions |
| Curve Fitting | local or pasted observations, weighting and fit model | CSV, TSV and text | local fit and local/asymptotic uncertainty are not identifiability proofs |
| Linear Algebra | matrix, optional vector, operation and tolerance | text, CSV, TSV or JSON | small dense matrices only |
| Networks | edge list, direction, weight meaning and analysis settings | text, CSV, edge-list or JSON | community/resilience outputs are algorithm-dependent diagnostics |
| Machine Learning | local table, feature/target roles, task, model and validation settings | CSV/TSV/text plus configuration JSON | validation estimates are finite-sample and not external validity |
| SciML | trajectory data or model text, workflow and noise seed | CSV, TSV, JSON, text or YAML-like model input | browser computation is limited; large neural/PDE workflows are export-only |
| Agent | state counts/fractions, topology, schedule, parameters, snapshots and custom rules | curated presets, custom model JSON or full configuration JSON | custom rules are declarative; arbitrary code is not executed |
| Symbolic | variables, parameters, expressions, values and finite search range | expression text or configuration JSON | narrow parser/differentiator, not a general CAS |
| Workbench | full adapter configuration JSON | JSON | orchestrates shared cores; focused labs remain the detailed editors |

## Deterministic model interchange

Model Studio and ODE Lab share `src/core/model-import.js`; identical input must therefore have identical parsing and rejection behavior.

| Format | Status | Notes |
|---|---|---|
| Foko project/model JSON | Executed | Full editable project or model object. |
| `foko.model-ir/1` JSON | Executed | Direct ODE and validated reaction-network lowering. |
| TXT/ODE | Executed | Line-oriented equations, initials, parameters/ranges, time and method. |
| Python dictionary | Executed as data | Requires `FOKO_MODEL`, `FOKO_PROJECT` or `DYNAMICS_LAB_CONFIG`; Python is never run. |
| JavaScript object | Executed as data | Requires `const`, `let` or `var FOKO_MODEL/FOKO_PROJECT`; JavaScript is never run. |
| YAML | Executed | Dependency-free declarative subset with nested maps and inline collections. |
| Model-table CSV | Executed | Rows identify equations, parameters, time settings and method. This is not trajectory-data CSV. |
| SBML | Strict subset | Species, reactions, numeric stoichiometry, parameters and supported MathML. See below. |
| CellML | Recognized, not executed | Convert with a standards-aware tool or provide Model IR. |
| SED-ML | Recognized, not executed | It describes an experiment; configure the experiment explicitly in Foko Lab. |
| COMBINE/OMEX | Recognized, not executed | Browser archive unpacking and cross-file semantics are unavailable. |

### Plain-text example

```text
name: Logistic growth
dx/dt = r*x*(1-x/K)
x(0) = 2
param r = 0.6 [0.1, 1.2]
param K = 100 [40, 180]
time 0 15 400
method: rk45
```

### Data-only dictionary example

```python
FOKO_MODEL = {
  'name': 'Exponential decay',
  'vars': ['x'],
  'eqs': ['-k*x'],
  'y0': [4],
  'params': {'k': [0.3, 0.1, 0.8]},
  't0': 0, 't1': 20, 'points': 300
}
```

The literal parser accepts strings, finite numbers, booleans, null/`None`, lists/tuples and nested objects. Imports containing executable expressions, function calls or statements are rejected.

## SBML boundary

The browser subset accepts reaction models with species, reactions, numeric stoichiometry, global/local parameters, unit-size compartments and supported arithmetic MathML. It rejects events, assignment/rate/algebraic rules, initial assignments, function definitions, constraints, delays, piecewise laws, Level 3 packages, non-unit compartments and unsupported MathML. Rejection is deliberate: producing a partial ODE while dropping semantics would be scientifically unsafe.

SBML does not define Foko Lab's requested time span, output grid or tolerance policy. Users must review these experiment settings before running. SED-ML and COMBINE archives are distinct experiment/packaging standards and are not silently treated as SBML.

## Reaction-network input

The ODE Lab accepts a validated `foko.model-ir/1` reaction network and lowers it to direct equations through stoichiometry before numerical execution. This schema is intentionally smaller than SBML and does not represent units, compartments, events, algebraic rules, delays or DAEs. See `MODEL_IR_CONTRACT.md`.

## Reproducibility and validity

A valid result export should include the release, validated configuration, seeds where relevant, algorithm, warnings and provenance. Saved/share states preserve configuration, not an unverifiable cached scientific claim. Results must be regenerated after import or restore.

Passing syntactic validation is not scientific validation. Users remain responsible for units, dimensional consistency, plausible parameter domains, calibration data, structural assumptions, solver convergence and comparison with independent evidence.

## Input safety

Imported files are read locally in the browser. Dictionary and agent-model imports are validated as data and cannot execute JavaScript or Python. Expression-based labs use restricted parsers and reject unsupported syntax instead of silently interpreting it.
