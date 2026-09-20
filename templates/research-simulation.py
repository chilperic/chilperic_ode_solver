#!/usr/bin/env python3
"""Independent simulation of an exported FokoLab model, using SciPy.

Install numpy and scipy, then run this file. This replays the current model's
trajectory, not parameter fits, ensembles or surrogate training. Expressions
are interpreted through a restricted AST; imported source code is not executed.
The output is simulation.csv. Numerical agreement is not empirical validation.
"""
from __future__ import annotations
import ast
import base64
import csv
import json
import math
import operator
from pathlib import Path
import numpy as np
from scipy.integrate import solve_ivp

MODEL = json.loads(base64.b64decode("{MODEL_BASE64}").decode("utf-8"))
FUNCTIONS = {name: getattr(math, name) for name in
             ("sin", "cos", "tan", "asin", "acos", "atan", "exp", "log", "sqrt", "floor", "ceil")}
FUNCTIONS.update({"abs": abs, "min": min, "max": max, "pow": pow, "round": round})
OPERATORS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
             ast.Div: operator.truediv, ast.Pow: operator.pow, ast.Mod: operator.mod}

def evaluate(node: ast.AST, scope: dict[str, float]) -> float:
    """Evaluate only scalar constants, named quantities, arithmetic and allowed calls."""
    if isinstance(node, ast.Expression):
        return evaluate(node.body, scope)
    if isinstance(node, ast.Constant) and type(node.value) in (int, float):
        return float(node.value)
    if isinstance(node, ast.Name) and node.id in scope:
        return float(scope[node.id])
    if isinstance(node, ast.BinOp) and type(node.op) in OPERATORS:
        return float(OPERATORS[type(node.op)](evaluate(node.left, scope), evaluate(node.right, scope)))
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        return evaluate(node.operand, scope) * (-1 if isinstance(node.op, ast.USub) else 1)
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in FUNCTIONS and not node.keywords:
        return float(FUNCTIONS[node.func.id](*(evaluate(a, scope) for a in node.args)))
    raise ValueError(f"Unsupported expression: {ast.dump(node)}")

def main() -> None:
    equations = [ast.parse(eq.replace("^", "**"), mode="eval") for eq in MODEL["eqs"]]
    parameters = {key: float(row[0]) for key, row in MODEL["params"].items()}
    def rhs(t: float, y: np.ndarray) -> np.ndarray:
        scope = {"pi": math.pi, "e": math.e, **parameters, "t": float(t),
                 **dict(zip(MODEL["vars"], map(float, y)))}
        values = np.asarray([evaluate(eq, scope) for eq in equations], dtype=float)
        if not np.isfinite(values).all():
            raise ValueError(f"Non-finite derivative at t={t}; check the model domain.")
        return values
    maximum = MODEL.get("maxStep", "auto")
    first = MODEL.get("initialStep", "auto")
    output_times = np.linspace(MODEL["t0"], MODEL["t1"], int(MODEL["points"]))
    solution = solve_ivp(rhs, (MODEL["t0"], MODEL["t1"]), MODEL["y0"], method="RK45",
                         t_eval=output_times, rtol=MODEL["rtol"], atol=MODEL["atol"],
                         max_step=np.inf if maximum == "auto" else float(maximum),
                         first_step=None if first == "auto" else float(first))
    if not solution.success or len(solution.t) != len(output_times):
        raise RuntimeError(solution.message)
    destination = Path("simulation.csv")
    with destination.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["time", *MODEL["vars"]])
        writer.writerows(zip(solution.t, *solution.y))
    print(f"Independent SciPy RK45: {solution.nfev} evaluations; {len(solution.t)} outputs.")
    print(f"Original configured method: {MODEL['method']}. This script deliberately uses SciPy RK45.")
    print(f"Saved {destination.resolve()}. Compare values and units; this is not empirical validation.")

if __name__ == "__main__":
    main()
