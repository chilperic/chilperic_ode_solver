# Chilperic ODE can import this file because it contains ODE_LAB_CONFIG.
ODE_LAB_CONFIG = {
  "module": "ode",
  "model": {
    "vars": ["x", "y", "z"],
    "eqs": ["sigma*(y-x)", "x*(rho-z)-y", "x*y-beta*z"],
    "y0": [1, 1, 1],
    "params": {"sigma": [10, 6, 16], "rho": [28, 12, 40], "beta": [2.6666666667, 2, 3]},
    "t0": 0, "t1": 35, "points": 2500, "method": "rk45"
  }
}
# END_ODE_LAB_CONFIG
