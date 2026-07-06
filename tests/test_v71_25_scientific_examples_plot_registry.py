"""
V71.27 regression contract.
Analysis examples are not passive labels: each migrated analysis lab must ship
at least ten concrete, plottable examples and at least ten selectable plot
modes. This protects the scientific UX standard requested for Statistics,
Curve Fitting, Linear Algebra and Networks.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LABS = {
    "statistics": ROOT / "src/labs/statistics.js",
    "fitting": ROOT / "src/labs/fitting.js",
    "linalg": ROOT / "src/labs/linalg.js",
    "networks": ROOT / "src/labs/networks.js",
}

REQUIRED_EXAMPLE_PHRASES = {
    "statistics": ["A/B Testing Framework", "Housing Price Predictor", "Clinical Trial Survival", "Gene Expression Matrix"],
    "fitting": ["Enzyme kinetics", "Pharmacokinetics PK/PD", "Adsorption isotherms", "Semiclassical wave packets"],
    "linalg": ["PageRank Engine", "Image SVD Compression", "Chemical Reaction Balancing", "Diffusion Heat Transfer"],
    "networks": ["Electrical Grid Vulnerability", "Supply Chain Logistics", "Metabolic Pathway Map", "Urban Traffic Congestion"],
}

REQUIRED_PLOT_PHRASES = {
    "statistics": ["Q-Q plot", "ROC", "Cook", "Kaplan-Meier"],
    "fitting": ["confidence ellipse", "Autocorrelation", "Chi-square", "Bootstrap"],
    "linalg": ["Gerschgorin", "Null-space", "Singular value", "sparsity"],
    "networks": ["Force-directed", "Adjacency matrix", "K-core", "Bipartite"],
}


def count_object_keys(js: str, name: str) -> int:
    m = re.search(rf"const\s+{name}\s*=\s*\{{(.*?)\}};", js, re.S)
    assert m, f"{name} object missing"
    return len(re.findall(r"\n?\s*[a-zA-Z0-9_]+\s*:\s*\{", m.group(1))) or len(re.findall(r"\n?\s*[a-zA-Z0-9_]+\s*:\s*'", m.group(1)))


def test_each_analysis_lab_has_ten_concrete_examples_and_ten_plots():
    for lab, path in LABS.items():
        js = path.read_text()
        assert count_object_keys(js, "EXAMPLES") >= 10, f"{lab} needs at least ten examples"
        assert count_object_keys(js, "PLOTS") >= 10, f"{lab} needs at least ten plot modes"
        for phrase in REQUIRED_EXAMPLE_PHRASES[lab]:
            assert phrase in js, f"{lab} missing example phrase: {phrase}"
        for phrase in REQUIRED_PLOT_PHRASES[lab]:
            assert phrase in js, f"{lab} missing plot phrase: {phrase}"


def test_examples_are_ready_to_plot_on_load():
    for path in LABS.values():
        js = path.read_text()
        assert "foko-shell-run" in js
        assert "setTimeout" in js
        assert "PlotSecondary" in js
        assert "Plottable example" in js


def test_shared_registry_documents_the_scientific_coverage():
    registry = (ROOT / "src/analysis-plot-registry.js").read_text()
    for group in ["statistics", "fitting", "linalg", "networks"]:
        assert group in registry
    for phrase in ["A/B Testing Framework", "Enzyme kinetics", "PageRank Engine", "Electrical Grid Vulnerability"]:
        assert phrase in registry


def test_registry_is_loaded_before_analysis_lab_descriptors():
    pages = {
        "statistics.html": "src/labs/statistics.js",
        "fitting.html": "src/labs/fitting.js",
        "linear-algebra.html": "src/labs/linalg.js",
        "networks.html": "src/labs/networks.js",
    }
    for page, lab_script in pages.items():
        html = (ROOT / page).read_text()
        assert "src/analysis-plot-registry.js?v=71.46.0" in html
        assert html.index("src/analysis-plot-registry.js") < html.index(lab_script)


def test_analysis_docs_and_tutorial_explain_example_workflow():
    for page in ["docs.html", "tutorial.html"]:
        html = (ROOT / page).read_text()
        assert "analysis-scientific-examples" in html
        assert "runs immediately" in html
        assert "two plots" in html
