from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LABS = {
    "statistics": ROOT / "src/labs/statistics.js",
    "fitting": ROOT / "src/labs/fitting.js",
    "linear algebra": ROOT / "src/labs/linalg.js",
    "networks": ROOT / "src/labs/networks.js",
}


def test_analysis_examples_are_explicitly_plottable_and_auto_run():
    """Examples must be runnable visual presets, not passive text labels."""
    for name, path in LABS.items():
        text = path.read_text()
        assert "Plottable example" in text, f"{name} should label examples as plottable"
        assert "function requestExamplePlot" in text, f"{name} needs an auto-run helper"
        assert "foko-shell-run" in text, f"{name} must dispatch shell run events"
        assert "Each example loads real input data" in text, f"{name} should explain the example behavior"
        assert "addEventListener('change'" in text and "requestExamplePlot(wrap)" in text, f"{name} example changes must trigger a plot"


def test_analysis_labs_keep_minimum_example_and_plot_coverage():
    """Each target lab keeps at least eight examples and eight plot modes."""
    for name, path in LABS.items():
        text = path.read_text()
        # Count option values inside the Example and Plot selects. This catches regressions
        # where a descriptor is simplified back to one or two examples.
        example_select = re.search(r'Plottable example<select[^>]*>(.*?)</select>', text, re.S)
        plot_select = re.search(r'Plot<select[^>]*>(.*?)</select>', text, re.S)
        assert example_select, f"{name} is missing an example selector"
        assert plot_select, f"{name} is missing a plot selector"
        assert example_select.group(1).count('<option') >= 8, f"{name} needs at least 8 plottable examples"
        assert plot_select.group(1).count('<option') >= 8, f"{name} needs at least 8 plot modes"


def test_docs_describe_examples_as_visible_outputs_not_architecture():
    docs = (ROOT / "docs.html").read_text() + (ROOT / "tutorial.html").read_text()
    assert "choosing an example loads real input data and renders an immediate diagnostic plot" in docs
    assert "runnable and plotted immediately" in docs
