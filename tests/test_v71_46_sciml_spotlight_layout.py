from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]


def test_sciml_spotlight_layout_css_present():
    css = (ROOT / 'styles' / 'sciml-lab.css').read_text(encoding='utf-8')
    assert 'v71.46 SciML spotlight layout' in css
    assert 'grid-template-areas:' in css
    assert '"primary diagnostic"' in css
    assert '"primary third"' in css
    assert '"artifact artifact"' in css
    assert '.sciml-cockpit-grid > .sciml-plot-card:nth-of-type(2)' in css
    assert 'min-height: clamp(520px, 58vh, 720px)' in css


def test_sciml_hero_hidden_and_workspace_wider_only_for_sciml():
    css = (ROOT / 'styles' / 'sciml-lab.css').read_text(encoding='utf-8')
    assert 'body[data-lab="sciml"] .sciml-hero' in css
    assert 'display: none;' in css
    assert 'max-width: min(1840px, calc(100vw - 32px))' in css
    assert 'body[data-lab="sciml"] .sciml-layout' in css


def test_sciml_phase_controls_not_permanently_disabled():
    css = (ROOT / 'styles' / 'sciml-lab.css').read_text(encoding='utf-8')
    assert '.sciml-phase-controls[hidden]' in css
    assert 'body[data-lab="sciml"] .sciml-phase-controls{\n  display: none !important;' not in css


def test_version_bumped_to_71_46():
    offenders=[]
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix.lower() in {'.html','.js','.css','.md','.json'}:
            try:
                txt=p.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                continue
            if '?v=' in txt and '?v=71.46.0' not in txt:
                offenders.append(str(p.relative_to(ROOT)))
    assert not offenders
