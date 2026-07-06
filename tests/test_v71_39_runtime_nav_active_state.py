from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
NAV = (ROOT / 'src' / 'navigation.js').read_text(encoding='utf-8')

def page(name):
    return (ROOT / name).read_text(encoding='utf-8')

def test_navigation_has_data_driven_active_resolver():
    assert 'function resolveActiveNavigationTarget()' in NAV
    assert 'document.body' in NAV
    assert 'dataset.lab' in NAV
    assert 'dataset.module' in NAV
    assert 'window.FokoNavigation.resolveActiveNavigationTarget' in NAV
    assert 'window.FokoNavigation.syncActiveNavigation' in NAV


def test_navigation_maps_primary_lab_sections():
    required = {
        "analysis:'analysis'",
        "statistics:'analysis'",
        "fitting:'analysis'",
        "linalg:'analysis'",
        "networks:'analysis'",
        "ode:'standalone'",
        "stochastic:'standalone'",
        "optimization:'standalone'",
        "steady:'standalone'",
        "sciml:'sciml'",
        "ml:'sciml'",
        "'model-workbench':'modeling'",
    }
    compact = re.sub(r'\s+', '', NAV)
    for item in required:
        assert item.replace(' ', '') in compact


def test_analysis_pages_declare_data_lab_and_modules():
    expected = {
        'statistics.html': 'statistics',
        'fitting.html': 'fitting',
        'linear-algebra.html': 'linalg',
        'networks.html': 'networks',
        'ml.html': 'ml',
    }
    for filename, module in expected.items():
        html = page(filename)
        assert 'data-lab="analysis"' in html
        assert f'data-module="{module}"' in html
        assert 'src/navigation.js?v=71.46.0' in html


def test_focused_pages_have_runtime_lab_identity():
    expected = {
        'ode.html': 'ode',
        'stochastic.html': 'stochastic',
        'optimization.html': 'optimization',
        'steady.html': 'steady',
    }
    for filename, lab in expected.items():
        html = page(filename)
        assert f'data-lab="{lab}"' in html
        assert 'src/navigation.js?v=71.46.0' in html


def test_no_stale_cache_tokens_after_v7139_bump():
    offenders = []
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix.lower() in {'.html', '.js', '.css', '.md', '.json'}:
            try:
                txt = p.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                continue
            if '?v=' in txt and '?v=71.46.0' not in txt:
                offenders.append(str(p.relative_to(ROOT)))
    assert not offenders
