# Chilperic ODE v2.1.1 — Final noise, redundancy, and export audit

## Scope

This audit targets the remaining interface noise after v2.1 curated stable, with special attention to example overflow, publication-figure export, feature ordering, and regression risk.

## Executive verdict

The core product direction is now sound: module-specific workflows, independent primary/secondary plots, figure settings, and contextual exports are in place. The remaining problem was not solver logic; it was presentation density. The examples area was visually overloaded because long model names such as `SIR beta–gamma` and `Lorenz rho–sigma` were exposed as chip titles. That made the first user decision area feel crowded before the user had even run a model.

The v2.1.1 curation makes the examples compact and treats long technical details as metadata, not primary labels.

## Final implemented changes

### 1. Example chip overflow fixed

Long example labels are shortened in the visible chip layer:

| Full model name | Visible chip |
|---|---|
| Lotka–Volterra sweep | Lotka–Volterra |
| Lorenz rho–sigma | Lorenz |
| SIR beta–gamma | SIR |
| SEIR incubation | SEIR |
| Enzyme kinetics sweep | Enzyme |
| Constrained quadratic | Quadratic |
| Rosenbrock on disk | Rosenbrock |
| Cylinder design | Cylinder |
| Portfolio toy model | Portfolio |

The full model name is preserved as the button title and accessible label, so no information is lost.

### 2. Example chip typography reduced

The example cards now use smaller typography, tighter padding, controlled max width, and ellipsis protection. The deck wraps on desktop instead of forcing horizontal overflow. On mobile, it remains horizontally scrollable because that is more usable than stacking many chips vertically.

### 3. Beta/gamma and rho/sigma removed from visible chip titles

Parameter-pair names are useful in documentation and dropdowns, but they are too noisy for the first visible model-selection row. The visible layer now shows the biological/dynamical-system identity, not the parameterization.

### 4. Figure-label export audit

The app already has the necessary figure export fields:

- title
- x label
- y label
- z label
- colorbar label
- width
- height
- font size
- line width
- marker size
- legend
- grid
- selected PNG export
- selected SVG export

The final patch improves the Plotly layout so `fontSize` is actually propagated to title, axes, ticks, legend, and global figure font. Exported figures now better reflect the configured typography.

### 5. Feature ordering assessment

The current workflow ordering is acceptable after curation:

1. mode
2. examples
3. model definition
4. run/sweep/optimize
5. results
6. figure settings/export
7. advanced solver/import/templates

This is the right hierarchy for a mixed educational/research workbench.

## Remaining design principles to preserve

### Do not re-expand the example cards

Examples should stay compact. Long scientific explanation belongs in the selected-model narrative, not every chip.

### Do not expose all figure controls by default

The single `Figure settings` entry point is correct. Publication controls are necessary, but they should not compete with Run.

### Do not make Export a top-level navigation item again

Export is contextual to results, not a primary destination.

### Do not merge parametric default-run and sweep results

The distinction is the core stability improvement of v2.

## Regression checks run

```bash
node --check src/app.js
node --check src/worker.js
```

DOM wiring check:

- 97 JavaScript `$('<id>')` references checked.
- 0 missing IDs in `index.html`.

## Final status

v2.1.1 is the cleaner stabilization target. The remaining issues after this point should be treated as functional bugs only, not as opportunities to add more visible controls.
