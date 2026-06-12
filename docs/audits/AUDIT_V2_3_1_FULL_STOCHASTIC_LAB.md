# Audit v2.3.1 — Full stochastic lab implementation

## Goal
Implement the stochastic model-atlas expansion without damaging the legacy deterministic ODE workbench.

## Architecture decision
The deterministic ODE/parametric/optimization workbench remains in `index.html` and `src/app.js`.
A new standalone `stochastic.html` page was added for stochastic simulations. This avoids coupling random-event logic to the legacy ODE solver and keeps the UI easier to reason about.

## Added runnable stochastic models
- Gillespie birth-death process
- Galton-Watson branching process
- Gambler's ruin
- Stochastic SIR epidemic
- Ehrenfest urn model
- Wright-Fisher neutral drift
- Geometric Brownian motion
- Parrondo's paradox
- Stochastic resonance
- Flashing ratchet / Brownian motor
- Multi-armed bandit
- Search / secretary problem
- T-cell proliferation cell-event simulator

## UI/UX changes
- Added `Stochastic Lab` to the top navigation.
- Model Atlas stochastic cards now link to runnable stochastic examples instead of passive roadmap cards.
- Added a two-lens explanation block for each model: deterministic lens vs stochastic lens.
- Added a left model-family selector, parameter panel, run button, seeded randomness, run count, summary metrics, insight panel, and two plots per model.
- Kept deterministic and stochastic workflows separate.
- Added responsive mobile layout for the stochastic lab.

## Legacy protection
- No existing ODE equations were removed.
- No legacy ODE solver functions were modified.
- Existing `src/app.js` remains responsible for deterministic ODE, parametric sweeps, optimization, plotting, and exports.
- The stochastic lab is additive and self-contained.

## Known boundaries
- Browser simulations are teaching-scale and portfolio-scale.
- The T-cell model is a reduced event simulator, not the full stochastic master equation solver.
- Advanced stochastic control examples are represented as reduced educational simulations, not full HJB solvers.
- Large Monte Carlo, calibrated inference, stiff stochastic chemical kinetics, and publication-grade fitting should be exported/reimplemented in Python, Julia, or R.
