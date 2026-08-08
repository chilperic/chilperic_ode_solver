from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]


def text(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def test_release_identity_and_port():
    assert json.loads(text("VERSION.json")) == {"version": "77.4.1", "token": "77.4.1"}
    package = json.loads(text("package.json"))
    assert package["version"] == "77.4.1"
    assert package["scripts"]["serve"] == "python3 scripts/serve-fresh.py"
    assert "freshPort()" in text("playwright.config.js")
    assert "process.env.FOKOLAB_PORT = String(PORT)" in text("playwright.config.js")


def test_agent_streams_actual_numerical_evidence_to_both_panels():
    core = text("src/core/agent-reference.js")
    worker = text("src/v72/agent-worker.js")
    workspace = text("src/v72/agent-workspace.js")
    assert "onFrame" in core
    assert "post(job, 'live-frame'" in worker
    assert "createSimulationRunner" in worker
    assert "liveDelayMs" in worker
    assert "agent-live-lattice" in workspace
    assert "agent-live-population" in workspace
    assert "dataset.liveStep" in workspace or "data-live-step" in workspace
    assert "current.index = (current.index + 1) %" not in workspace
    assert "Replay" in workspace


def test_research_models_are_exposed_with_honest_boundaries():
    app = text("src/app.js")
    steady = text("src/models/steady-presets.js")
    catalog = text("src/models/scientific-example-catalog.js")
    assert "'FA metabolism bistability'" in app
    assert "'FADNS semi-mechanistic'" in app
    assert "does not certify bistability or root completeness" in app
    assert "not the complete calibrated thesis implementation" in app
    assert "'Fatty-acid metabolism branch exploration'" in steady
    assert "does not certify root completeness or bistability" in steady
    assert "'Fatty-acid conditional MalCoA–FA slice'" in steady
    assert "not the stability of the full four-state model" in steady
    assert "'FADNS enzyme occupancy and CoA sequestration'" in steady
    assert "interpretation: 'algebraic'" in steady
    assert "Fatty-acid conditional MalCoA–FA slice" in catalog
    assert "FADNS enzyme occupancy and CoA sequestration" in catalog


def test_steady_workspace_filters_declared_nonphysical_roots():
    workspace = text("src/v72/steady-workspace.js")
    for token in [
        "physicalAdmissibility",
        "admissibleSolutions",
        "rejectedSolutions",
        "Physically admissible roots",
        "physically inadmissible",
    ]:
        assert token in workspace


def test_browser_gate_repairs_are_retained():
    config = text("playwright.config.js")
    access = text("tests/e2e/accessibility-performance.spec.js")
    smoke = text("tests/e2e/main-labs-smoke.spec.js")
    registry = text("tests/e2e/registry-agent-animation.spec.js")
    assert "workers: Number(process.env.FOKOLAB_E2E_WORKERS || 1)" in config
    assert "nav[aria-label=\"Primary navigation\"]" in access
    assert "page.setViewportSize({ width: 1600" in access
    assert "agentSnapshotCount').fill('4')" in access
    assert "agentSnapshotCount').fill('4')" in smoke
    assert "agent-live-lattice" in registry
    assert "agent-live-population" in registry
