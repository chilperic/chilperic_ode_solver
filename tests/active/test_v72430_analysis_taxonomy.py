import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_taxonomy_has_exact_requested_main_sections():
    taxonomy = json.loads((ROOT / 'ANALYSIS_TAXONOMY.json').read_text())
    assert taxonomy['schema'] == 'fokolab-analysis-taxonomy-v1'
    for section, field in [
        ('optimization', 'plots'), ('optimization', 'problems'),
        ('multiObjective', 'plots'), ('multiObjective', 'problems'),
        ('steadyState', 'plots'), ('steadyState', 'problems'),
    ]:
        assert len(taxonomy[section][field]) == 15


def test_taxonomy_is_integrated_without_advertising_unsupported_runtime_views():
    optimization = (ROOT / 'optimization.html').read_text()
    steady = (ROOT / 'steady.html').read_text()
    docs = (ROOT / 'docs.html').read_text()
    assert 'src/models/analysis-taxonomy.js' in optimization
    assert 'optimizationTaxonomyCatalog' in optimization
    assert 'src/models/analysis-taxonomy.js' in steady
    assert 'steadyTaxonomyCatalog' in steady
    assert 'Sensitivity Analysis Lab' in docs
    assert 'Only views backed by the current computed result appear in plot dropdowns' in optimization
    assert 'Pseudo-arclength continuation' in steady


def test_new_runtime_diagnostics_are_backed_by_source_paths():
    optimization = (ROOT / 'src/v72/optimization-workspace.js').read_text()
    steady = (ROOT / 'src/v72/steady-workspace.js').read_text()
    for plot_id in ('dominance-heatmap', 'crowding-distance', 'hypervolume-convergence', 'objective-correlation', 'knee-point', 'local-sensitivity'):
        assert f"'{plot_id}'" in optimization
    for plot_id in ('jacobian-sign', 'stiffness-indicator', 'implicit-sensitivity'):
        assert f"'{plot_id}'" in steady
    assert 'Bayesian Optimization' not in optimization.split('function availablePlotTypes()', 1)[1].split('function updatePlotSelectors()', 1)[0]
    assert 'Trust-Region Radius Plot' not in optimization.split('function availablePlotTypes()', 1)[1].split('function updatePlotSelectors()', 1)[0]


def test_optimization_mobile_tabs_are_contained_without_page_overflow():
    css = (ROOT / 'styles/v72-lab-shell.css').read_text()
    offline = (ROOT / 'scripts/check-analysis-taxonomy-offline.js').read_text()
    mobile = css.split('@media (max-width: 1100px)', 1)[1].split('@media (max-width: 720px)', 1)[0]
    assert 'overflow-x: auto' in mobile
    assert 'max-width: 100%' in mobile
    assert '.side-nav .nav-item { flex: 0 0 auto;' in mobile
    assert 'optimizationMobileOverflowContract' in offline
    assert 'document.documentElement.scrollWidth' in offline
    assert "documentWidth <= geometry.viewport + 2" in offline
