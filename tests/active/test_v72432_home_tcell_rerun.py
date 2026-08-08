from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_tcell_rerun_uses_new_deterministic_seed_and_stale_run_tokens():
    source = text('src/home-demo-reel.js')
    assert 'const demoAttempts = new Map()' in source
    assert 'const demoTokens = new Map()' in source
    assert 'const activeWorkers = new Map()' in source
    assert 'const animationHandles = new Map()' in source
    assert 'const seed = baseSeed + attempt' in source
    assert 'context.isCurrent()' in source


def test_tcell_rerun_cancels_old_worker_and_canvas_animation():
    source = text('src/home-demo-reel.js')
    assert 'cancelActiveWorker(key)' in source
    assert 'taskWorker.terminate()' in source
    assert 'cancelAnimation(canvasId)' in source
    assert "error.name === 'AbortError'" in source


def test_home_editable_model_has_offline_and_local_browser_regressions():
    package = text('package.json')
    offline = text('scripts/check-home-research-rerun-offline.js')
    e2e = text('tests/e2e/registry-agent-animation.spec.js')
    assert 'test:home-research-rerun-offline' in package
    assert "#v76HomeCapacity" in offline
    assert "data-engine" in offline
    assert 'home project console recomputes and the newest inputs own the result' in e2e
