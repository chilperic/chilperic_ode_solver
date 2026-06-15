# Foko Lab model import templates

You can upload model files directly in the app. Supported formats:

- `.json` — recommended and most reliable
- `.csv` — useful for spreadsheets
- `.txt` / `.ode` — compact hand-written model format
- `.yaml` / `.yml` — limited simple key-value support
- `.py` — importable only when the file contains an `DYNAMICS_LAB_CONFIG = {...}` JSON block

## JSON schema

### ODE model

```json
{
  "module": "ode",
  "model": {
    "vars": ["x", "y"],
    "eqs": ["alpha*x - beta*x*y", "delta*x*y - gamma*y"],
    "y0": [10, 5],
    "params": {
      "alpha": {"value": 1.1, "min": 0.4, "max": 2.4},
      "beta": [0.4, 0.08, 0.9]
    },
    "t0": 0,
    "t1": 40,
    "points": 1200,
    "method": "rk45"
  }
}
```

### Parametric ODE sweep

```json
{
  "module": "param",
  "model": {
    "vars": ["S", "I", "R"],
    "eqs": ["-beta*S*I/N", "beta*S*I/N-gamma*I", "gamma*I"],
    "y0": [990, 10, 0],
    "params": {"beta": [0.35, 0.05, 1.1], "gamma": [0.1, 0.03, 0.4], "N": [1000, 1000, 1000]},
    "t0": 0,
    "t1": 120,
    "points": 900,
    "method": "rk45",
    "sweep": ["beta", "gamma", "I", "max"]
  }
}
```

### Optimization problem

```json
{
  "module": "opt",
  "model": {
    "sense": "minimize",
    "variables": [
      {"name": "x", "initial": 1, "lower": 0, "upper": 10},
      {"name": "y", "initial": 1, "lower": 0, "upper": 10}
    ],
    "objective": "(x-3)^2 + (y-2)^2",
    "ineq": ["x + y - 4", "-x", "-y"],
    "eq": []
  }
}
```

## TXT / ODE syntax

```txt
module: ode
dx/dt = sigma*(y-x)
dy/dt = x*(rho-z)-y
dz/dt = x*y-beta*z
initial x = 1
initial y = 1
initial z = 1
param sigma = 10 [6, 16]
param rho = 28 [12, 40]
param beta = 2.6666666667 [2, 3]
time 0 35 2500
method: rk45
```

## CSV syntax

Use the downloadable CSV template. The important rows are:

- `module,,ode`
- `equation,x,,,,sigma*(y-x),1`
- `parameter,sigma,10,6,16,,`
- `time,t0,0,,,,`
- `solver,method,rk45,,,,`

## Python import

A general Python script cannot be safely parsed. Use an embedded JSON block:

```python
DYNAMICS_LAB_CONFIG = {
  "module": "ode",
  "model": {
    "vars": ["x"],
    "eqs": ["-k*x"],
    "y0": [10],
    "params": {"k": [0.3, 0, 2]},
    "t0": 0,
    "t1": 20,
    "points": 800,
    "method": "rk45"
  }
}
# END_DYNAMICS_LAB_CONFIG
```
