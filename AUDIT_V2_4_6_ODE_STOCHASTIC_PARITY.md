# Chilperic Dynamics v2.4.6 — ODE/Stochastic interface parity cleanup

## Reason for this release

The v2.4.5 Stochastic Lab still did not visually follow the ODE Lab strongly enough. The main criticism was UX asymmetry: stochastic examples were still too noisy, plots were hidden behind a Results tab, some labels looked like inactive feature badges, and the Model Atlas did not separate problems by primary mathematical category.

## Applied changes

- Rebuilt `stochastic.html` into a closer analogue of the ODE Lab layout:
  - left model library,
  - central controls/editor panel,
  - fixed right-side results workspace,
  - two persistent plot panels.
- Removed the Results tab. Stochastic plots are now always visible like the ODE Lab plots.
- Removed visible tag badges such as Gillespie/extinction/mean-field from the title card.
- Removed the visible "Customize this example" workflow. CTMC templates are directly editable after loading, matching the ODE example-as-template workflow.
- Renamed "New custom CTMC" to "Blank CTMC model".
- Moved raw JSON editing into an advanced collapsible section to reduce first-screen noise.
- Added working stochastic plot selectors:
  - ensemble paths,
  - mean trajectory,
  - single path,
  - mean plus mean-field when available,
  - diagnostic distribution,
  - metrics bar chart.
- Added fixed diagnostic status values above the plot area: runtime, runs, and mean final value.
- Reorganized the Model Atlas around primary categories:
  - ODE,
  - Optimization,
  - Stochastic,
  with additional scientific-domain filters kept secondary.
- Replaced user-facing “workbench” wording with “ODE Lab” / “Stochastic Lab” where relevant.

## Boundary

The Stochastic Lab still supports several different stochastic engines. CTMC models are structurally editable. Non-CTMC engines remain parameter-editable and specialized because branching processes, random walks, SDEs, and decision models do not share the same event-propensity schema.

## Checks

- `node --check src/stochastic/stochastic-lab.js`
- Cache strings updated to `v2.4.6`.
