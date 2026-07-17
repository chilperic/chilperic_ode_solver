from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_plot_lifecycle_finishes_in_rendered_state():
    runtime = text("src/v72/accessibility-performance.js")
    assert "setLifecycleState(node, 'rendered', false)" in runtime
    assert "node.setAttribute('aria-busy', busy ? 'true' : 'false')" in runtime
    assert "node.dataset.renderState = 'ready';" not in runtime


def test_workbench_gate_checks_registry_without_public_developer_noise():
    e2e = text("tests/e2e/main-labs-smoke.spec.js")
    assert "toContainText('FokoODECore')" in e2e
    assert "window.FokoWorkbenchAdapters" in e2e
    assert "typeof ode.runPreset === 'function'" in e2e
    assert "toContainText('FokoWorkbenchAdapters')" not in e2e
