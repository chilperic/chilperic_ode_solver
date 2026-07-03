import pytest
pytestmark = pytest.mark.skip(reason='Superseded by the v70 IDE dashboard/navigation contract.')

from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def text(path):
    return (ROOT / path).read_text(encoding='utf-8')

def test_home_headline_smaller_and_current():
    html = text('index.html')
    assert 'Modeling workspace.' in html
    assert 'Model. Simulate. Export.' not in html
    assert 'Build, simulate, export.' not in html
    assert 'Build equations, set parameters, inspect dynamics and export clean models.' in html

def test_brand_svg_has_no_magenta():
    logo = text('assets/brand/foko-lab-logo.svg')
    mark = text('assets/brand/foko-lab-mark.svg')
    for bad in ['#155EEF', '#155EEF', 'magenta', '#155EEF', '#155EEF']:
        assert bad not in logo
        assert bad not in mark

def test_home_css_has_v69_creator_overlap_contract():
    css = text('styles/style.css')
    assert 'v69 home + brand correction' in css
    assert 'grid-template-columns:minmax(190px,240px) minmax(0,1fr)' in css
    assert 'word-break:normal' in css
    assert 'background:linear-gradient(90deg,var(--foko-teal),#00AEEF)' in css

def test_cache_tokens_bumped_for_style_and_logo():
    html = text('index.html')
    assert 'styles/style.css?v=2.7.5' in html
    assert 'foko-lab-logo.svg?v=3.2.0' in html
    assert 'foko-lab-mark.svg?v=3.2.0' in html
