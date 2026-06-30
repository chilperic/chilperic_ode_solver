from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT/rel).read_text(encoding='utf-8')

def soup(rel):
    return BeautifulSoup(read(rel),'html.parser')

def test_symbolic_lab_exposes_the_promised_operations():
    doc=soup('symbolic.html')
    op=doc.select_one('#symOperation')
    assert op is not None
    values=[o.get('value') for o in op.find_all('option')]
    for value in ['simplify','expand','factor','differentiate','integrate']:
        assert value in values
    for selector in ['#symEigen','#symOdeSolve','#symJacobian','#symPython']:
        assert doc.select_one(selector) is not None


def test_symbolic_js_has_real_browser_light_boundaries_and_fallbacks():
    js=read('src/symbolic-lab.js')
    for token in ['symOperation','integrate','expand','factor','eigenvals','dsolve','math.js unavailable','curatedOperation','window.math.derivative']:
        assert token in js
    assert "if(document.readyState==='loading')" in js
    assert 'DOMContentLoaded' in js


def test_symbolic_examples_have_curated_equilibria_eigen_and_ode_notes():
    js=read('src/symbolic-lab.js')
    for token in ['equilibria:[', 'eigen:', 'ode:', 'nondim:', 'r - 2 r x/K', 'lambda=\\\\pm i']:
        assert token in js
    assert 'arbitrary exact equilibria are exported to SymPy' in js


def test_math_beauty_gallery_contains_missing_planned_families():
    html=read('beauty.html')
    js=read('src/math-beauty.js')
    for token in ['lsystem','lissajous','modclock','mobius','torus','godel']:
        assert token in js.lower()
    for text in ['Topology','Möbius strips','formal limits']:
        assert text in html


def test_math_beauty_dragon_rewrite_no_replaceall_regression():
    js=read('src/math-beauty.js')
    assert 'function rewriteDragon' in js
    assert "replaceAll('F','F+G').replaceAll('G','F-G')" not in js
    assert 'requestAnimationFrame' in js
    assert 'roundedRect' in js


def test_workbench_custom_model_import_still_present_after_symbolic_patch():
    html=read('workbench.html')
    js=read('src/model-workbench-v3.js')
    for selector in ['customModelImport','customModelJson','importCustomModel','loadCustomOdeExample','loadCustomOptExample']:
        assert selector in html
    for token in ['normalizeCustomModel','compileExpression','Custom import currently supports ODE and 2D OPT models','CUSTOM_ODE_EXAMPLE','CUSTOM_OPT_EXAMPLE']:
        assert token in js
