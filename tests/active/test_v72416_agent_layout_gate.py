from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def text(relative):
    return (ROOT / relative).read_text(encoding="utf-8")


def test_agent_browser_speed_values_exist_in_the_product_control():
    html = text("agent.html")
    select = re.search(r'<select\s+id="agentLiveSpeed"[^>]*>(.*?)</select>', html, re.S)
    assert select, "agentLiveSpeed select is absent"
    available = set(re.findall(r'<option\b[^>]*value="([^"]+)"', select.group(1)))
    spec = text("tests/e2e/registry-agent-animation.spec.js")
    requested = set(re.findall(r"#agentLiveSpeed'\)\.selectOption\('([^']+)'\)", spec))
    assert requested, "Agent browser tests do not exercise the live-speed control"
    assert requested <= available, f"browser test requests unavailable speed values: {requested - available}"


def test_agent_gate_no_longer_requests_the_removed_120_speed_value():
    spec = text("tests/e2e/registry-agent-animation.spec.js")
    assert "#agentLiveSpeed').selectOption('120')" not in spec
    assert "#agentLiveSpeed').selectOption('90')" in spec


def test_offline_chromium_gate_exercises_the_reported_agent_path():
    source = text("scripts/check-agent-layout-offline.js")
    for evidence in (
        "assertTwoUp(state, 'opening right dropdown')",
        "assertTwoUp(state, 'pre-run selector swap')",
        "assertTwoUp(state, 'live selector swap')",
        "assertTwoUp(state, 'delayed completion')",
        "activeRenderRoots('left')",
        "activeRenderRoots('right')",
        "canvas.agent-live-lattice",
        "canvas.agent-live-population",
    ):
        assert evidence in source


def test_release_runner_executes_offline_browser_gate_before_complete_localhost_suite():
    runner = text("test-v77.4.1-local.sh")
    offline = runner.index("npm run test:agent-layout-offline")
    complete = runner.index("npm run test:e2e")
    assert offline < complete
