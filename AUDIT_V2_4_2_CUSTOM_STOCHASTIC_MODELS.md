# Audit v2.4.2 — Custom stochastic model builder

## Core issue found

The previous Stochastic Lab still depended too much on curated examples. It had a structured CTMC editor for existing examples, but the user-facing workflow did not make it explicit or easy to start from a blank model and construct a new stochastic process the way the ODE Lab allows users to enter their own equations.

## Changes applied

- Added a visible **New custom CTMC model** action in the Stochastic Lab model library.
- Added a **New blank CTMC** action inside the Model editor.
- Added a full CTMC/Gillespie builder for user-defined models:
  - add/remove states
  - add/remove parameters
  - add/remove stochastic events
  - add/remove derived plotting variables
  - edit propensities directly
  - edit integer state updates as JSON
- Added CTMC schema validation before runs:
  - state names must be valid identifiers
  - duplicate state names are rejected
  - parameters must be numeric
  - propensities are syntax-checked
  - event updates must target existing states
- Improved JSON import so a pasted model schema can become a custom stochastic model, not merely overwrite the currently selected example.
- Improved custom-model persistence through the `#custom-ctmc` route.
- Updated README and Docs to explain custom CTMC/Gillespie creation.

## Design principle

The symmetry with the ODE Lab is now clearer:

- **ODE Lab:** define variables, parameters, and differential equations; solve trajectories.
- **Stochastic Lab:** define states, parameters, event propensities, and state jumps; simulate event histories and distributions.

## Remaining boundary

The fully generic editable workbench currently targets CTMC/Gillespie models. Specialized families such as Wright-Fisher, GBM, stochastic resonance, bandits, and secretary problems remain parameter-editable examples because they use distinct mathematical engines rather than a shared event-propensity schema.

## Recommended next step

Add an optional custom SDE editor:

```text
dX = f(X,t) dt + g(X,t) dW
```

with Euler-Maruyama simulation and exact GBM templates.
