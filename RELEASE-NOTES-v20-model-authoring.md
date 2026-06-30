# Foko Lab v20 — model authoring across labs

## Summary
All specialist labs now expose a model-authoring standard: implement/import a model, choose a method or modeling approach, inspect diagnostics, and export the model state.

## Agent Lab
- Exposes modeling approach selection: Rule-Based Decision Making, State-Driven / Statecharts, Adaptive & Learning Agents, Graph / Network-Based Approach.
- Separates update semantics: discrete synchronous, discrete asynchronous, continuous-time rate approximation.
- Adds topology control: Moore, Von Neumann, random graph, small-world graph.
- Adds custom model JSON with states, colors, parameter meanings, rule code and metadata.
- Custom rules can return a state number or an object with state/trait/event.
- Adds approach comparison, transition/event plot, network degree plot and spatial occupancy profile.

## Symbolic Lab
- Adds analysis approach selector and custom symbolic model JSON.
- Keeps plotting and SymPy export as the validation route for exact solving.

## Other labs
- ODE, Optimization, Steady-State and Stochastic pages now explicitly document own-model routes and method choices.

## Docs/tutorial
- Updated the platform standard and tutorials around model authoring rather than decorative examples.
