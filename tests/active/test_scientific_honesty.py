from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def all_public_text() -> str:
    paths = list(ROOT.glob("*.html")) + list((ROOT / "research").glob("*.html"))
    return "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in paths)


def test_symbolic_scope_is_not_overclaimed():
    text = all_public_text()
    assert "Exact algebra, Jacobians and expression inspection" not in text
    assert "Use symbolic computation for exact differentiation" not in text
    symbolic = (ROOT / "symbolic.html").read_text()
    docs = (ROOT / "docs.html").read_text()
    assert "not a complete computer algebra system" in docs
    assert "Capability boundary:" in symbolic
    assert "exact algebra" in symbolic.lower()
    assert "SymPy" in symbolic


def test_capability_matrix_separates_compute_export_and_unavailable():
    data = json.loads((ROOT / "CAPABILITIES.json").read_text())
    allowed = {"reference", "browser-computed", "derived-browser", "limited-browser", "export-only", "legacy-migration", "unavailable"}
    assert set(data["statusDefinitions"]) == allowed
    statuses = []
    for lab in data["labs"].values():
        statuses.append(lab["interface"])
        statuses.extend(lab["capabilities"].values())
        assert lab.get("limitations")
    assert set(statuses).issubset(allowed)
    assert "browser-computed" in statuses
    assert "export-only" in statuses
    assert "unavailable" in statuses


def test_sciml_and_linalg_use_real_diagnostic_cores():
    linalg_core = (ROOT / "src/core/linalg.js").read_text()
    sindy_core = (ROOT / "src/core/sindy.js").read_text()
    linalg_lab = (ROOT / "src/labs/linalg.js").read_text()
    sciml_lab = (ROOT / "src/sciml-lab.js").read_text()
    assert "symmetricEigenvalues" in linalg_core
    assert "powerIterationTrace" in linalg_core
    assert "paretoSweep" in sindy_core
    assert ".symmetricEigenvalues" in linalg_lab
    assert "FokoSINDy.paretoSweep" in sciml_lab
    assert "window.FokoSINDy.paretoSweep is not a function" not in sciml_lab


def test_agent_lab_reports_rules_seeds_and_finite_ensemble_limits():
    capabilities = json.loads((ROOT / "CAPABILITIES.json").read_text())
    agent = capabilities["labs"]["agent"]
    assert agent["interface"] == "reference"
    assert agent["capabilities"]["seeded_random_sequential_lattice_models"] == "browser-computed"
    assert agent["capabilities"]["finite_ensemble_quantiles"] == "browser-computed"
    assert agent["capabilities"]["empirical_calibration"] == "unavailable"
    text = (ROOT / "agent.html").read_text()
    assert "algorithmic clock" in text
    assert "not automatically biological, social or physical time" in text


def test_contract_blocks_blank_or_decorative_science():
    contract = (ROOT / "SCIENTIFIC_CONTRACT.md").read_text()
    assert "Empty visual symmetry is not a result" in contract
    assert "A best sampled candidate is not a proof of global optimality" in contract
    assert "A browser diagnostic is not evidence" in (ROOT / "CAPABILITIES.json").read_text()
