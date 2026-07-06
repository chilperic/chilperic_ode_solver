"""
V71.47 — SciML + Linear Algebra scientific-honesty guard.

Purpose: lock in the removal of DECORATIVE plots (hardcoded arrays,
Math.sin/Math.random curves labelled as real training/spectral diagnostics)
and confirm the replacements are wired to the tested cores.

The numerical correctness of the replacements lives in the Node test
tests/js/honest-diagnostics.test.js. This file guards the source so the
fabrications cannot silently return.

Run: python -m pytest tests/test_v71_47_sciml_linalg_honesty.py -q
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as fh:
        return fh.read()


# ----------------------------- SciML ---------------------------------

FABRICATED_SCIML_MODES = [
    "speedup", "uncertainty", "ood_boundary", "loss_landscape",
    "adjoint_trace", "shadow_relevance", "fno_spectrum", "deeponet_basis",
    "pinn_loss",
]


def test_sciml_fabricated_plot_branches_removed():
    js = read("src/sciml-lab.js")
    for mode in FABRICATED_SCIML_MODES:
        assert f"kind==='{mode}'" not in js, f"fabricated SciML plot branch still present: {mode}"


def test_sciml_fabricated_options_removed_from_html():
    html = read("sciml.html")
    for mode in FABRICATED_SCIML_MODES:
        assert f'value="{mode}"' not in html, f"fabricated SciML plot option still in HTML: {mode}"


def test_sciml_no_fake_training_loss_curve():
    # The tell-tale synthetic training-loss expression must be gone.
    js = read("src/sciml-lab.js")
    assert "Math.exp(-e/" not in js, "synthetic training-loss curve still present"
    # Math.random must only survive in the Gaussian noise generator (randn),
    # used to add realistic observation noise to SIMULATED data — not in plots.
    for line in js.splitlines():
        if "Math.random" in line:
            assert "randn" in line, f"Math.random outside randn(): {line.strip()[:80]}"


def test_sciml_pareto_is_real_sweep():
    js = read("src/sciml-lab.js")
    assert "FokoSINDy.paretoSweep" in js, "SciML pareto plot must call the real STLSQ sweep"
    # The old hardcoded curve is gone.
    assert "Math.exp(-k/2)+0.015*k" not in js, "hardcoded fake Pareto curve still present"


# ------------------------- Linear Algebra ----------------------------

def test_linalg_hardcoded_arrays_removed():
    js = read("src/labs/linalg.js")
    assert "55,74,86,94,100" not in js, "hardcoded cumulative-variance array still present"
    assert "0.8,0.55,0.35,0.22,0.15" not in js, "hardcoded power-iteration trace still present"
    assert "conditionSurface" not in js, "bogus condition-number surface still present"


def test_linalg_plots_call_the_core():
    js = read("src/labs/linalg.js")
    assert "L.symmetricEigenvalues" in js, "svdVariance/spectrum must use real symmetricEigenvalues"
    assert "L.powerIterationTrace" in js, "powerTrace must use real power-iteration trace"
    assert "L.nullSpace(A)" in js, "nullspace plot must use the real null-space basis"


# --------------------------- Cores -----------------------------------

def test_cores_export_new_functions():
    assert "paretoSweep" in read("src/core/sindy.js"), "sindy core missing paretoSweep export"
    la = read("src/core/linalg.js")
    assert "symmetricEigenvalues" in la and "powerIterationTrace" in la, \
        "linalg core missing new diagnostic exports"
