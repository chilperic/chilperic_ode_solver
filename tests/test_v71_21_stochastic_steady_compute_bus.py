from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_compute_bus_exposes_local_bus_path_for_legacy_science_labs():
    src = read('src/platform/compute-bus.js')
    assert "runLocal" in src
    assert "local executor" in src
    assert "record.local" in src
    assert "RELEASE: '71.46.0'" in src


def test_stochastic_execution_is_routed_through_compute_bus():
    src = read('src/stochastic/stochastic-lab.js')
    assert "stochasticBusJob" in src
    assert "FokoComputeBus" in src
    assert "runLocal(job, exec)" in src
    assert "stochastic-ensemble" in src
    assert "Done via compute bus" in src
    assert "computeBus = { routed: true" in src


def test_steady_state_solve_and_continuation_are_routed_through_compute_bus():
    src = read('src/steady-state-lab.js')
    assert "steadyBusJob" in src
    for token in ['steady-solve', 'steady-continuation', 'steady-continuation-2d']:
        assert token in src
    assert src.count('runLocal(job') >= 3
    assert "Solved via compute bus" in src
    assert "Continuation complete via compute bus" in src
    assert "2D continuation complete via compute bus" in src


def test_release_token_is_normalized_to_v71_21():
    html = list(ROOT.glob('*.html'))
    assert html
    for page in html:
        text = page.read_text(encoding='utf-8')
        assert '?v=' + '71.20.0' not in text
        if 'compute-bus.js' in text:
            assert 'compute-bus.js?v=71.46.0' in text
