# Chilperic ODE v2.2.1 — Feature audit and fixes

## Scope

This audit focused on features reported as broken or confusing after v2.2.0:

- optimization examples opened from the Model Atlas,
- optimization plot types,
- Pareto/frontier visualization,
- objective/constraint trade-off plotting,
- figure noise in the PhD FADNS description,
- Model Atlas schematic robustness.

## Findings

### Fixed: optimization examples linked from the atlas but absent from the workbench

The Model Atlas linked to Lasso, Runge, and Secretary examples, but these models were not present in `EXAMPLES.opt`. Opening those links therefore loaded the default optimization model rather than the requested example.

Fix: added the missing workbench optimization definitions:

- Lasso regression geometry,
- Runge fitting caution,
- Secretary stopping rule,
- Pareto design trade-off.

### Fixed: no secondary objective support for Pareto plots

The optimization model only had one objective. This made real Pareto/frontier visualization impossible.

Fix: added optional `objective2` support in the optimization UI, import logic, template export, worker payload, and optimization sample output.

### Fixed: optimization plot menu too narrow

The optimization plot registry lacked dedicated Pareto and feasibility-map views.

Fix: added:

- Pareto frontier,
- Feasibility map.

### Fixed: convergence plot assumed minimization

The convergence plot used `Math.min` even for maximize problems.

Fix: convergence now uses `Math.max` for maximize and `Math.min` for minimize. Log scale is only used when all values are positive.

### Fixed: one-variable optimization plots were fragile

The optimization sample plot assumed a second decision variable was available.

Fix: one-variable examples now plot variable value against objective. This stabilizes the Secretary problem.

### Fixed: FADNS description noise

The long FADNS narrative was too dense in the workbench and Model Atlas.

Fix: shortened the visible text while preserving the scientific content:

> Refined PhD FADNS model with CoA sequestration: substrate pools, FAS-bound elongation states, ECoA inhibition, and C14/C16/C18 products.

The complete mechanism remains in the equations and model page context.

### Checked: Model Atlas links

All `Open in workbench` links were checked against `EXAMPLES` definitions.

Result: 0 broken atlas links.

### Checked: DOM wiring

All JavaScript `$(...)` DOM references were checked against `index.html`.

Result: 100 DOM references, 0 missing IDs.

### Checked: syntax

Commands run:

```bash
node --check src/app.js
node --check src/worker.js
```

Both passed.

## Remaining boundary

Browser optimization remains exploratory. The random-search + coordinate-descent solver is useful for teaching geometry, feasibility, and trade-offs, but serious constrained or multi-objective optimization should still be exported to SciPy/CasADi/Pyomo.
