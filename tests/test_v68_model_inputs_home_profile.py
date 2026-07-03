import pytest
pytestmark = pytest.mark.skip(reason='Superseded by the v70 IDE dashboard/navigation contract.')
from pathlib import Path
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding="utf-8")
def soup(p): return BeautifulSoup(read(p), "html.parser")

def test_sciml_exposes_manual_initial_conditions_and_parameter_ranges():
    s=soup("sciml.html")
    assert s.select_one("#sciInitialEditor") is not None
    assert s.select_one("#sciParamEditor") is not None
    assert "Initial conditions / state sizes" in read("sciml.html")
    assert "Parameters and ranges" in read("sciml.html")
    assert "Apply inputs and run" in read("sciml.html")
    assert "Update plot" not in read("sciml.html")

def test_sciml_js_applies_manual_inputs_to_generated_data():
    js=read("src/sciml-lab.js")
    for token in ["populateModelInputs", "readModelInputs", "buildDataFromCurrentInputs", "applyInputsAndAnalyze", "paramRanges", "initialConditions"]:
        assert token in js

def test_phase_controls_are_hidden_until_phase_plot_and_do_not_overflow():
    html=read("sciml.html")
    css=read("styles/sciml-lab.css")
    assert 'id="sciPhaseControls"' in html
    assert 'hidden]' in css
    assert "minmax(0,1fr)" in css

def test_home_creator_block_has_no_profile_overlap_contract():
    html=read("index.html")
    css=read("styles/style.css")
    assert "Modeling workspace." in html
    assert "Build, simulate, export." not in html
    assert "Model. Simulate. Export." not in html
    assert "grid-template-columns:minmax(190px,240px) minmax(0,1fr)" in css
    assert "word-break:normal" in css
