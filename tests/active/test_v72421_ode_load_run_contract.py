from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_ode_example_loading_remains_separate_from_computation():
    source = text('src/app.js')
    assert "$('loadExample').addEventListener('click',()=>loadExample($('exampleSelect').value));" in source
    load_block = source.split('function loadExample(name){', 1)[1].split('\n}', 1)[0]
    assert 'runModel(' not in load_block
    assert 'runBtn' in text('ode.html')


def test_geometry_browser_gate_runs_ode_after_loading_example():
    spec = text('tests/e2e/main-labs-smoke.spec.js')
    block = spec.split("test('shared plot geometry prevents title, legend and axis collisions in representative labs'", 1)[1]
    block = block.split("test('Steady-State exposes a deep searchable library", 1)[0]
    assert "#loadExample').click()" in block
    assert "#topStatus')).toHaveText('Ready')" in block
    assert "#runBtn').click()" in block
    assert block.index("#loadExample').click()") < block.index("#runBtn').click()")


def test_offline_chromium_gate_exercises_the_same_ode_load_run_boundary():
    script = text('scripts/check-plot-steady-symbolic-offline.js')
    block = script.split('async function odeLoadRunGeometryContract(browser)', 1)[1]
    block = block.split('async function authoredScreenshotLabsContract(browser)', 1)[0]
    assert "selectOption({ label: 'Van der Pol' })" in block
    assert "#loadExample').click()" in block
    assert "Loading an ODE example must not compute it implicitly" in block
    assert "#runBtn').click()" in block
    assert "selectOption('stiffness')" in block
    assert block.index("#loadExample').click()") < block.index("#runBtn').click()") < block.index("selectOption('stiffness')")
