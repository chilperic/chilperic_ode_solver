from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]

def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')

def test_agent_is_worker_backed_cancellable_and_render_verified():
    page = BeautifulSoup(read('agent.html'), 'html.parser')
    controller = read('src/v72/agent-workspace.js')
    worker = read('src/v72/agent-worker.js')
    assert page.select_one('#agentUpdateSchedule')
    assert page.select_one('#agentInitialization')
    assert page.select_one('#cancelAgent')
    assert page.select_one('#pauseAgent')
    assert page.select_one('#agentLiveSpeed')
    assert page.select_one('#agentAbsorbed')
    assert page.select_one('#agentLargestCluster')
    assert "new Worker('src/v72/agent-worker.js?v=72.47.0')" in controller
    assert 'cancelRun' in controller
    assert 'No partial ensemble was published' in controller
    assert 'failRender' in controller
    assert 'Computed numerical result retained' in controller
    assert 'plotSerial' in controller
    assert 'ticket!==state.plotSerial[side]' in controller
    assert 'const ticket=++state.plotSerial[side]' in controller
    assert 'hasVisibleEvidence' in controller
    assert 'Plotly returned no visible evidence' in controller
    assert "importScripts('../core/agent-reference.js?v=72.47.0')" in worker
    assert "post(job, 'progress'" in worker
    assert "post(job, 'complete'" in worker

def test_agent_core_reports_spatial_endpoint_and_reproducibility_evidence():
    core = read('src/core/agent-reference.js')
    for token in ['updateSchedule', 'initialization', 'clusterSummary', 'largestClusterFraction',
                  'absorptionStep', 'terminalCounts', 'terminalOutcomes', 'wilsonInterval', 'mcse', 'configHash', 'summarizeRuns', 'segregationContext']:
        assert token in core
    assert 'browser safety budget' in core
    assert 'document.' not in core

def test_sciml_noise_is_seeded_and_exported():
    page = BeautifulSoup(read('sciml.html'), 'html.parser')
    source = read('src/sciml-lab.js')
    assert page.select_one('#sciSeed')
    assert 'seededRandom' in source
    assert 'noiseSeed' in source
    assert 'Math.random()' not in source

def test_canvas_mode_and_container_responsiveness_exist():
    nav = read('src/navigation.js')
    css = read('styles/v72-lab-shell.css')
    assert 'wireCanvasMode' in nav
    assert 'canvasModeToggle' in nav
    assert 'fokolab:layout-change' in nav
    assert 'container-type: inline-size' in css
    assert 'body.v72-canvas-mode' in css
    assert '@container (max-width: 1099px)' in css

def test_agent_model_specification_is_shipped_and_bounded():
    spec = read('AGENT_MODEL_SPEC.md')
    assert 'random-with-replacement' in spec
    assert 'shuffled-sweep' in spec
    assert 'uniformly from the current empty-site pool' in spec
    assert 'Publication use requires' in spec

def test_release_does_not_ship_obsolete_app_backup():
    assert not (ROOT / 'src/app.js.bak-v7146').exists()
