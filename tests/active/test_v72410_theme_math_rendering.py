from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOKENS = (ROOT / 'styles/v72-tokens.css').read_text(encoding='utf-8')
NAV = (ROOT / 'src/navigation.js').read_text(encoding='utf-8')
SHARED = (ROOT / 'src/v72/accessibility-performance.js').read_text(encoding='utf-8')
SHELL = (ROOT / 'styles/v72-lab-shell.css').read_text(encoding='utf-8')
SYMBOLIC_CSS = (ROOT / 'styles/v72-symbolic.css').read_text(encoding='utf-8')
SYMBOLIC_CORE = (ROOT / 'src/core/symbolic-reference.js').read_text(encoding='utf-8')

THEMES = [
    'aurora', 'clarity', 'ocean', 'emerald', 'steel', 'royal', 'olive',
    'copper', 'paper', 'graphite', 'slate', 'midnight', 'forest', 'contrast'
]
MAINTAINED_MATH = [
    'src/app.js',
    'src/v72/steady-workspace.js',
    'src/v72/stochastic-workspace.js',
    'src/v72/optimization-workspace.js',
    'src/v72/symbolic-workspace.js',
    'src/sciml-lab.js',
]


def text(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_all_theme_choices_own_the_canonical_v72_palette():
    for theme in THEMES:
        selector = f'html[data-theme="{theme}"]'
        assert selector in TOKENS, theme
        block = TOKENS.split(selector, 1)[1].split('}', 1)[0]
        for variable in [
            '--ink:', '--muted:', '--surface:', '--surface-soft:', '--canvas:',
            '--line:', '--brand:', '--brand-strong:', '--nav:', '--nav-2:'
        ]:
            assert variable in block, (theme, variable)
    assert 'var(--theme-glow' in TOKENS
    assert 'applyTheme(currentTheme());' in NAV
    assert NAV.index('applyTheme(currentTheme());') < NAV.index('injectThemeControl();')


def test_theme_change_restyles_existing_plotly_evidence():
    assert 'shared Plotly theme bridge' in SHARED
    assert "root.addEventListener('foko-theme-change'" in SHARED
    assert "document.querySelectorAll('.js-plotly-plot').forEach(relayout)" in SHARED
    for property_name in [
        'paper_bgcolor', 'plot_bgcolor', "'font.color'", "'xaxis.gridcolor'",
        "'scene.bgcolor'", "'polar.bgcolor'"
    ]:
        assert property_name in SHARED


def test_one_strict_math_renderer_is_used_by_every_maintained_math_surface():
    assert 'shared mathematical typesetting boundary' in SHARED
    for required in [
        'throwOnError: true', "output: 'htmlAndMathml'", 'trust: false',
        "node.dataset.mathStatus = 'rendered'", "node.dataset.mathStatus = 'fallback'",
        "node.dataset.mathOverflow = String(node.scrollWidth > node.clientWidth + 2)"
    ]:
        assert required in SHARED
    for path in MAINTAINED_MATH:
        source = text(path)
        assert 'FokoMathRender.render' in source, path
        assert 'throwOnError:false' not in source.replace(' ', ''), path
        assert 'throwOnError: false' not in source, path


def test_long_equations_are_bounded_inside_scrollable_math_blocks():
    for required in [
        '.foko-math-output', 'overflow-x: auto', 'max-width: 100%',
        'min-width: max-content', '[data-math-overflow="true"]', '.foko-math-fallback'
    ]:
        assert required in SHELL
    for required in [
        '#symbolicEquations', 'min-width: 0', 'max-width: 100%',
        '.symbolic-matrix { max-height: 360px; overflow: auto;'
    ]:
        assert required in SYMBOLIC_CSS


def test_symbolic_identifiers_use_semantic_greek_and_subscripts():
    assert 'function latexIdentifier(name)' in SYMBOLIC_CORE
    assert "sigma:'\\\\sigma'" in SYMBOLIC_CORE
    assert "return base + '_{'" in SYMBOLIC_CORE
    controller = text('src/v72/symbolic-workspace.js')
    assert 'Core.latexIdentifier(result.config.variables[index])' in controller
    assert '\\\\frac{d ' in controller
    assert '\\\\partial f_{' in controller
