# Foko Lab model intermediate representation — `foko.model-ir/1`

The Model IR is a small declarative input contract for browser-scale ODE models. It separates model authoring from numerical execution.

## Supported kinds

### `direct-ode`

Defines variables, initial values, parameters and one right-hand-side expression per variable.

### `reaction-network`

Defines variables, parameters and reactions. Each reaction has:

- a unique identifier;
- a restricted rate expression;
- a stoichiometric change for affected variables.

The browser lowers the network to direct equations using

```text
dx/dt = N · v(x,p)
```

before passing the result to the existing ODE validator and solver.

## Safety and validation

- Identifiers must be valid and unique.
- Initial values and parameters must be finite.
- Stoichiometric coefficients must be finite.
- Rate and ODE expressions use the platform's restricted expression evaluator.
- Unknown variables, duplicate identifiers and unsupported model kinds are rejected.
- Imported JSON cannot execute arbitrary JavaScript.

## Scope

This contract is not SBML and does not claim semantic equivalence to SBML, CellML or Modelica. Events, algebraic rules, delays, units, compartments and DAEs are not represented in the v72.16 schema. Those require a larger standards and numerical audit.
