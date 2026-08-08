from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_scientific_registry_never_writes_layout_state():
    source = text('src/v72/scientific-registry.js')
    assert not re.search(r'\.dataset\.layout\s*=', source)
    assert not re.search(r'setAttribute\(["\']data-layout["\']', source)
    assert 'metadata-only' in source


def test_workspace_title_is_compact_and_plots_receive_the_space():
    css = text('styles/v72-lab-shell.css')
    assert '.v72-workspace-head h1' in css
    assert 'font-size: clamp(1.15rem, 1.55vw, 1.55rem)' in css
    assert '.plot { width: 100%; min-height: 430px' in css
    assert 'grid-template-columns: 54px minmax(310px, 350px) minmax(0, 1fr) minmax(250px, 285px)' in css


def test_public_page_titles_are_not_marketing_billboards():
    css = text('styles/v72-public-shell.css')
    assert 'font-size: clamp(1.65rem, 2.8vw, 2.45rem)' in css
    atlas = text('styles/v72-atlas.css')
    assert 'font-size:clamp(1.55rem,2.5vw,2.2rem)' in atlas


def test_home_editable_experiment_uses_real_core_and_routes_to_full_lab():
    source = text('src/v76/home-workspace.js')
    page = text('index.html')
    assert 'FokoODECore.solveWithRhs' in source
    assert 'id="v76HomeRate"' in page
    assert 'href="ode.html"' in page
