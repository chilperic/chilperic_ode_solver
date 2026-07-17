#!/usr/bin/env python3
"""Differential validation against independent scientific Python libraries.

This suite is intentionally separate from the lightweight release gate because SciPy,
scikit-learn, NetworkX and SymPy are substantial optional validation dependencies.
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

try:
    import numpy as np
    import scipy
    from scipy import integrate, optimize, stats
    import sklearn
    from sklearn.linear_model import Ridge, LogisticRegression
    from sklearn.decomposition import PCA
    import networkx as nx
    import sympy as sp
except ImportError as exc:  # pragma: no cover - explicit user-facing path
    print("Reference dependencies are missing:", exc, file=sys.stderr)
    print("Install with: python -m pip install -r requirements-validation.txt", file=sys.stderr)
    raise SystemExit(2)


def close(name: str, got: float, expected: float, atol: float, rtol: float = 0.0) -> dict:
    error = abs(float(got) - float(expected))
    tolerance = atol + rtol * abs(float(expected))
    return {
        "name": name,
        "status": "pass" if math.isfinite(error) and error <= tolerance else "fail",
        "got": float(got),
        "expected": float(expected),
        "absoluteError": error,
        "tolerance": tolerance,
    }


def exact(name: str, got, expected) -> dict:
    return {"name": name, "status": "pass" if got == expected else "fail", "got": got, "expected": expected}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", type=Path, help="Write the full validation record to this path.")
    args = parser.parse_args()

    probe = subprocess.run(
        ["node", "scripts/reference-probe.js"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    js = json.loads(probe.stdout)
    checks: list[dict] = []

    # ODE: compare the browser RK45 trajectory endpoint with SciPy DOP853.
    ref_ode = integrate.solve_ivp(lambda _t, y: y, (0.0, 2.0), [1.0], method="DOP853", rtol=1e-12, atol=1e-14, t_eval=[2.0])
    checks.append(close("ODE exponential endpoint", js["ode"]["expFinal"], ref_ode.y[0, -1], 2e-8))

    # Statistics: same test definitions and asymptotic conventions where available.
    group_a = np.array([1.2, 1.8, 2.0, 2.6, 3.1, 3.8, 4.0])
    group_b = np.array([2.0, 2.4, 2.9, 3.5, 4.1, 4.8, 5.3, 5.7])
    welch = stats.ttest_ind(group_a, group_b, equal_var=False)
    checks.append(close("Welch t statistic", js["statistics"]["welch"]["t"], welch.statistic, 2e-10))
    checks.append(close("Welch two-sided p value", js["statistics"]["welch"]["p"], welch.pvalue, 3e-4))
    anova = stats.f_oneway([1, 2, 3, 4], [2, 3, 4, 5], [7, 8, 9, 10])
    checks.append(close("One-way ANOVA F", js["statistics"]["anova"]["F"], anova.statistic, 1e-10))
    checks.append(close("One-way ANOVA p", js["statistics"]["anova"]["p"], anova.pvalue, 4e-4))
    corr = stats.pearsonr([1, 2, 3, 4, 5, 6], [1.1, 1.9, 3.2, 3.8, 5.1, 5.9])
    checks.append(close("Pearson correlation", js["statistics"]["correlation"]["r"], corr.statistic, 1e-12))
    checks.append(close("Pearson p value", js["statistics"]["correlation"]["p"], corr.pvalue, 5e-4))

    # Mann-Whitney is deliberately audited as an approximation rather than silently
    # treated as exact; tied small samples can differ from SciPy's continuity handling.
    mw_ref = stats.mannwhitneyu([1, 2, 2, 4, 7], [3, 4, 5, 6, 8], alternative="two-sided", method="asymptotic", use_continuity=False)
    mw_delta = abs(js["statistics"]["mannWhitneyApprox"]["p"] - mw_ref.pvalue)
    checks.append({
        "name": "Mann-Whitney approximation audit",
        "status": "pass" if mw_delta <= 0.035 else "fail",
        "got": js["statistics"]["mannWhitneyApprox"]["p"],
        "expected": float(mw_ref.pvalue),
        "absoluteError": mw_delta,
        "tolerance": 0.035,
        "note": "Browser result is labelled asymptotic and is not an exact small-sample p value.",
    })

    # Linear algebra.
    A = np.array([[4.0, 1.0, 0.0], [1.0, 3.0, 1.0], [0.0, 1.0, 2.0]])
    b = np.array([1.0, 2.0, 3.0])
    solution = np.linalg.solve(A, b)
    for i, expected in enumerate(solution):
        checks.append(close(f"Linear solve coefficient {i}", js["linalg"]["solution"][i], expected, 2e-10))
    eig = np.linalg.eigvalsh(np.array([[2.0, 1.0], [1.0, 2.0]]))[::-1]
    for i, expected in enumerate(eig):
        checks.append(close(f"Symmetric eigenvalue {i}", js["linalg"]["eigenvalues"][i], expected, 2e-9))
    singular = np.linalg.svd(np.array([[3.0, 0.0], [0.0, 1.0], [0.0, 0.5]]), compute_uv=False)
    for i, expected in enumerate(singular):
        checks.append(close(f"Singular value {i}", js["linalg"]["singularValues"][i], expected, 2e-8))

    # Network algorithms.
    graph = nx.Graph()
    graph.add_weighted_edges_from([("A", "B", 1), ("B", "C", 2), ("A", "C", 5), ("C", "D", 1), ("B", "D", 6)])
    checks.append(close("Weighted shortest-path distance", js["networks"]["shortestDistance"], nx.shortest_path_length(graph, "A", "D", weight="weight"), 1e-12))
    checks.append(exact("Weighted shortest-path nodes", js["networks"]["shortestPath"], nx.shortest_path(graph, "A", "D", weight="weight")))
    mst_graph = nx.Graph()
    mst_graph.add_weighted_edges_from([("A", "B", 1), ("B", "C", 2), ("A", "C", 4), ("C", "D", 1), ("B", "D", 5)])
    checks.append(close("Minimum spanning-tree weight", js["networks"]["mstWeight"], nx.minimum_spanning_tree(mst_graph).size(weight="weight"), 1e-12))

    # ML: ridge with unpenalized intercept and deterministic PCA.
    Xr = np.array([[0, 0], [1, 2], [2, 1], [3, 4], [4, 3], [5, 5]], dtype=float)
    yr = 1.25 + 2.0 * Xr[:, 0] - 0.5 * Xr[:, 1]
    ridge = Ridge(alpha=0.2, fit_intercept=True, solver="cholesky").fit(Xr, yr)
    expected_ridge = np.concatenate([[ridge.intercept_], ridge.coef_])
    for i, expected in enumerate(expected_ridge):
        checks.append(close(f"Ridge coefficient {i}", js["ml"]["ridgeCoefficients"][i], expected, 2e-9))
    pca_data = np.array([[1, 1.1, 2], [2, 2.0, 4], [3, 3.2, 6], [4, 4.1, 8], [5, 5.0, 10], [6, 6.2, 12]], dtype=float)
    standardized = (pca_data - pca_data.mean(axis=0)) / pca_data.std(axis=0, ddof=1)
    pca = PCA(n_components=2, svd_solver="full").fit(standardized)
    for i, expected in enumerate(pca.explained_variance_ratio_):
        checks.append(close(f"ML PCA explained variance {i}", js["ml"]["pcaExplained"][i], expected, 2e-5))

    # Symbolic differentiation evaluated numerically.
    x = sp.symbols("x", real=True)
    derivative = sp.diff(sp.sin(x) * sp.exp(x) + x**3, x)
    for i, value in enumerate([0.2, 0.7, 1.3]):
        checks.append(close(f"Symbolic derivative at {value}", js["symbolic"]["derivativeAt"][i], float(derivative.subs(x, value)), 1e-10))

    # Stochastic first moment: require analytic mean to fall inside a conservative
    # 4-SE Monte Carlo interval; this validates distributional behavior, not bitwise
    # agreement with another RNG.
    analytic_mean = 40 * math.exp((0.18 - 0.14) * 5)
    stochastic_error = abs(js["stochastic"]["finalMean"] - analytic_mean)
    stochastic_tol = max(1.0, 4 * js["stochastic"]["finalSe"])
    checks.append({
        "name": "Birth-death first moment",
        "status": "pass" if stochastic_error <= stochastic_tol else "fail",
        "got": js["stochastic"]["finalMean"],
        "expected": analytic_mean,
        "absoluteError": stochastic_error,
        "tolerance": stochastic_tol,
    })
    checks.append(exact("Stochastic event-cap censoring", js["stochastic"]["truncatedRuns"], 0))

    # Optimization against SciPy's bounded L-BFGS-B reference.
    reference_opt = optimize.minimize(lambda z: (z[0] - 2) ** 2 + (z[1] + 1) ** 2, np.array([-1.5, 2.0]), method="L-BFGS-B", bounds=[(-5, 5), (-5, 5)])
    for i, expected in enumerate(reference_opt.x):
        checks.append(close(f"Optimization candidate {i}", js["optimization"]["candidate"][i], expected, 2e-5))
    checks.append(close("Optimization objective", js["optimization"]["objective"], reference_opt.fun, 2e-9))
    checks.append(exact("Optimization feasibility", js["optimization"]["feasible"], True))

    failed = [check for check in checks if check["status"] != "pass"]
    record = {
        "release": json.loads((ROOT / "VERSION.json").read_text())["version"],
        "libraries": {
            "numpy": np.__version__,
            "scipy": scipy.__version__,
            "scikitLearn": sklearn.__version__,
            "networkx": nx.__version__,
            "sympy": sp.__version__,
            "node": subprocess.run(["node", "--version"], capture_output=True, text=True, check=True).stdout.strip(),
        },
        "summary": {"passed": len(checks) - len(failed), "failed": len(failed), "total": len(checks)},
        "checks": checks,
    }
    if args.json:
        args.json.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(f"{record['summary']['passed']}/{record['summary']['total']} differential reference checks passed")
    if failed:
        for check in failed:
            print("FAIL", check["name"], "got", check.get("got"), "expected", check.get("expected"), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
