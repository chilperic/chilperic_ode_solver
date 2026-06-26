# Foko Lab current online + workbench atlas — ODE legacy fix audit

## Baseline
Built from the user-uploaded `chilperic_ode_solver-main.zip`.

## Boundary
The current online/legacy app is preserved. The ODE Lab legacy file and core runtime are taken directly from the uploaded ZIP.

Unchanged legacy files verified by SHA-256:

- `index.html`
- `ode.html`
- `optimization.html`
- `steady.html`
- `stochastic.html`
- `docs.html`
- `tutorial.html`
- `styles/style.css`
- `src/app.js`
- `src/worker.js`
- `src/stochastic/stochastic-lab.js`
- `src/optimization-lab.js`
- `src/steady-state-lab.js`

## Intentional additions

- `workbench.html`
- `model.html` compatibility alias
- `src/model-workbench-v3.js`
- `src/plot-fallback.js`
- `styles/model-workbench-v3.css`

## Intentional modification

- `examples.html`: adds `Open in Workbench` links while preserving existing `Open in lab` links.

## Result
The current ODE Lab legacy page remains the attached version. The workbench is adjacent and accessible through Model Atlas links.
