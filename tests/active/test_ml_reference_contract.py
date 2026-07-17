from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_ml_uses_authored_v72_workspace():
    page = (ROOT / "ml.html").read_text(encoding="utf-8")
    assert 'data-v72-shell="true"' in page
    assert 'src/v72/ml-workspace.js?v=72.46.0' in page
    assert 'src/core/ml-reference.js?v=72.46.0' in page
    assert 'src/models/ml-presets.js?v=72.46.0' in page
    assert 'id="mlPlotGrid"' in page
    assert 'data-layout-mode="two"' in page
    assert 'data-layout-mode="three"' not in page
    assert 'data-layout-mode="focus"' in page
    assert 'src/labs/ml.js' not in page
    assert 'src/platform/shell.js' not in page


def test_ml_scientific_boundaries_are_explicit():
    page = (ROOT / "ml.html").read_text(encoding="utf-8")
    workspace = (ROOT / "src/v72/ml-workspace.js").read_text(encoding="utf-8")
    core = (ROOT / "src/core/ml-reference.js").read_text(encoding="utf-8")
    assert "Training accuracy is not validation" in page
    assert "preprocessing fitted inside training folds" in page
    assert "Binary classification requires explicit 0/1 labels" in workspace
    assert "No causal, external-validity" in workspace
    assert "crossValidate" in core
    assert "permutationImportance" in core
    assert "learningCurve" in core
    assert "fitStandardizer(XtrRaw)" in core


def test_ml_example_library_is_substantive():
    presets = (ROOT / "src/models/ml-presets.js").read_text(encoding="utf-8")
    assert presets.count("title:") >= 14
    for phrase in [
        "Heteroscedastic regression",
        "Collinear predictors",
        "Imbalanced rare-event classification",
        "Leakage trap",
        "Anisotropic clusters",
        "Small-n, high-p warning",
    ]:
        assert phrase in presets


def test_sciml_loads_the_pareto_capable_core():
    page = (ROOT / "sciml.html").read_text(encoding="utf-8")
    core = (ROOT / "src/core/sindy.js").read_text(encoding="utf-8")
    compatibility = (ROOT / "src/sindy.js").read_text(encoding="utf-8")
    assert 'src/core/sindy.js?v=72.46.0' in page
    assert "function paretoSweep" in core
    assert "paretoSweep: paretoSweep" in core
    assert "function paretoSweep" in compatibility
    assert 'src="src/sindy.js' not in page


def test_current_version_and_port_are_consistent():
    package = (ROOT / "package.json").read_text(encoding="utf-8")
    playwright = (ROOT / "playwright.config.js").read_text(encoding="utf-8")
    version = (ROOT / "VERSION.json").read_text(encoding="utf-8")
    assert '"version": "72.46.0"' in package
    assert "8100" in package
    assert "8100" in playwright
    assert '"version":"72.46.0"' in version.replace(" ", "")
