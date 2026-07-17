from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def test_workbench_owns_its_selector_state_once():
    registry = read("src/v72/scientific-registry.js")
    workspace = read("src/v72/workbench-workspace.js")
    assert "workbench: { gridId:" not in registry
    assert "notifyOptionsChanged('workbench')" not in workspace
    assert "notifyRendered('workbench')" not in workspace

def test_workbench_exposes_shared_two_up_layout_contract():
    page = read("workbench.html")
    assert 'data-layout-mode="two" data-wb-layout="two"' in page
    assert 'data-layout-mode="focus" data-wb-layout="focus"' in page
    assert 'data-layout="two"' in page
    assert 'data-preferred-layout="two"' in page

def test_workbench_cards_use_shared_evidence_card_names():
    page = read("workbench.html")
    assert 'data-plot-card="left"' in page
    assert 'data-plot-card="right"' in page

def test_workbench_plot_changes_do_not_mutate_layout_preference():
    workspace = read("src/v72/workbench-workspace.js")
    selector_binding = workspace.split("for(let card=0;card<2;card+=1)", 1)[1].split("document.querySelectorAll('[data-wb-download]')", 1)[0]
    assert "state.layout" not in selector_binding
    assert "FokoLayoutStability.apply" in workspace
    assert "preferred: preferred" in workspace
    assert "breakpoint: 1024" in workspace
