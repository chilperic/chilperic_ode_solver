# v2.3.0 additive stochastic atlas roadmap

## Goal
Extend the Model Atlas toward stochastic processes, Gillespie/event simulation, genetics, finance, paradoxes, and stochastic control without breaking the legacy ODE workbench.

## Modified files
- `examples.html`
  - Kept all existing atlas cards.
  - Added filter chips: Stochastic, Simulation, Genetics, Finance, Control.
  - Added additive roadmap cards for Gillespie, Galton-Watson, Gambler's ruin, stochastic SIR/SIS, Ehrenfest urn, Wright-Fisher, geometric Brownian motion, Parrondo, stochastic resonance, Brownian motor, multi-armed bandit, search/secretary, and T-cell proliferation.
- `styles/style.css`
  - Added small styling only for roadmap cards and stochastic/control visual accents.
- `docs.html`
  - Added a stochastic atlas roadmap section and compatibility rule.

## Compatibility boundary
No existing ODE, parameter sweep, optimization examples, worker logic, export logic, solver logic, or legacy atlas images were removed or renamed. New stochastic cards are roadmap cards unless they point to an already existing workbench example.

## Next implementation step
Build a reusable Gillespie/event-simulation module before wiring stochastic cards into runnable workbench examples. This avoids duplicating stochastic logic across SIR, chemical kinetics, gene expression, and T-cell proliferation.
