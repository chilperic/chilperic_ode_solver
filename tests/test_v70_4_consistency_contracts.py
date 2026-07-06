from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
HTML = list(ROOT.glob('*.html')) + list((ROOT / 'research').glob('*.html'))


def soup(path: Path):
    return BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')


def local_target(path: Path, href: str):
    base = href.split('#', 1)[0].split('?', 1)[0]
    if not base:
        return path
    return (path.parent / base).resolve()


def test_v70_4_css_loaded_after_main_styles():
    for path in HTML:
        s = soup(path)
        links = [l.get('href', '') for l in s.find_all('link', rel=lambda v: v and 'stylesheet' in v)]
        assert any('v70-4-consistency.css?v=71.46.0' in href for href in links), path
        assert any('v70-5-home-nav.css?v=71.46.0' in href for href in links), path
        assert 'v=70.3.0' not in path.read_text(encoding='utf-8'), path


def test_local_hash_anchors_exist():
    failures = []
    for path in HTML:
        s = soup(path)
        for a in s.find_all('a', href=True):
            href = a['href']
            if href.startswith(('http:', 'https:', 'mailto:', 'tel:', '#')):
                if href.startswith('#') and href != '#':
                    if not s.find(id=href[1:]):
                        failures.append(f'{path.name} -> {href}')
                continue
            if '#' not in href:
                continue
            target = local_target(path, href)
            if not target.exists() or target.suffix != '.html':
                continue
            target_soup = soup(target)
            anchor = href.split('#', 1)[1]
            if anchor and not target_soup.find(id=anchor):
                failures.append(f'{path.name} -> {href}')
    assert not failures, '\n'.join(failures)


def test_public_controls_have_accessible_names():
    missing = []
    for path in HTML:
        s = soup(path)
        for el in s.find_all(['input', 'select', 'textarea']):
            if el.name == 'input' and el.get('type') == 'hidden':
                continue
            if el.get('aria-label') or el.get('aria-labelledby'):
                continue
            if el.find_parent('label') is not None:
                continue
            ident = el.get('id')
            if ident and s.find('label', attrs={'for': ident}):
                continue
            missing.append(f'{path.name}: <{el.name} id={ident!r}>')
    assert not missing, '\n'.join(missing[:80])


def test_false_selected_state_css_contract():
    css = (ROOT / 'styles' / 'v70-4-consistency.css').read_text(encoding='utf-8')
    assert 'hover is not selection' in css
    assert "not(.active)" in css
    assert '.tab.active' in css and '.tab:hover' in css
    assert 'background-image:none' in css


def test_v70_4_navigation_sync_present():
    nav = (ROOT / 'src' / 'navigation.js').read_text(encoding='utf-8')
    assert 'function syncActiveNavigation' in nav
    assert 'aria-current' in nav
    assert 'markWorkbench' in nav


def test_plot_toolbar_consistency_layer_present():
    css = (ROOT / 'styles' / 'v70-4-consistency.css').read_text(encoding='utf-8')
    assert '.plot-toolbar-v2' in css
    assert 'grid-template-columns:minmax(220px,1fr)' in css
    assert '.results-card .tab' in css
    assert 'text-overflow:ellipsis' in css
