from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def test_home_demo_reel_has_five_acts_and_all_labs_are_represented():
    page = BeautifulSoup((ROOT / 'index.html').read_text(encoding='utf-8'), 'html.parser')
    acts = [node.get_text(' ', strip=True) for node in page.select('.home-reel-act .home-act-heading h2')]
    assert acts == [
        'Explore model dynamics',
        'Check whether a good fit is trustworthy',
        'Research behind Foko Lab',
        'Analyse data and fitted models',
        'Understand the limits of each result',
    ]
    assert len(page.find_all('h1')) == 1
    assert len(page.select('.trust-home-primary')) == 1
    labels = ' '.join(node.get_text(' ', strip=True) for node in page.select('.home-engine-row, .home-analysis-row, .home-supporting-index'))
    for label in ('ODE', 'Steady-State', 'Stochastic', 'Agent', 'Curve fitting', 'Statistics', 'Machine learning', 'SciML', 'Optimization', 'Symbolic', 'Linear Algebra', 'Networks', 'Workbench'):
        assert label in labels


def test_home_demo_module_calls_real_cores_and_has_no_decorative_random_curve():
    source = (ROOT / 'src/home-demo-reel.js').read_text(encoding='utf-8')
    worker = (ROOT / 'src/home-demo-worker.js').read_text(encoding='utf-8')
    for token in ('FokoODECore', 'FokoSteadyCore', 'FokoFitting', 'FokoStatistics', 'FokoMLReference', 'FokoSINDy', 'FokoOptimizationCore'):
        assert token in source
    assert 'FokoStochasticCore.simulateEnsemble' in worker
    assert 'FokoAgentReference.simulate' in worker
    for forbidden in ('Math.random(', 'Math.sin(', 'hardcodedSeries', 'cachedTrajectory'):
        assert forbidden not in source
        assert forbidden not in worker
    assert 'IntersectionObserver' in source
    assert 'prefers-reduced-motion' in source


def test_home_claim_labels_are_user_facing_and_link_to_trust():
    page = BeautifulSoup((ROOT / 'index.html').read_text(encoding='utf-8'), 'html.parser')
    labels = [node.get_text(' ', strip=True) for node in page.select('.home-evidence-key a')]
    assert any(text.startswith('Computed here') for text in labels)
    assert any(text.startswith('Limited') for text in labels)
    assert any(text.startswith('Export workflow') for text in labels)
    assert any(text.startswith('Not available') for text in labels)
    assert all((node.get('href') or '').startswith('trust.html') for node in page.select('.home-evidence-key a'))

def test_home_restores_thermoplants_as_protected_research_not_a_fake_demo():
    page = BeautifulSoup((ROOT / 'index.html').read_text(encoding='utf-8'), 'html.parser')
    research = page.select_one('.act-research')
    text = research.get_text(' ', strip=True).lower()
    assert 'fatty-acid metabolism' in text
    assert 'fadns' in text
    assert 't-cell proliferation' in text
    assert 'thermoplants' in text
    assert 'c3–c4' in text or 'c3-c4' in text
    protected = research.select_one('[data-research-card="thermoplants"]')
    assert protected is not None
    assert protected.select_one('[data-run-demo]') is None
    assert 'protected unpublished research' in protected.get_text(' ', strip=True).lower()
    photosynthesis = (ROOT/'research/photosynthesis.html').read_text(encoding='utf-8')
    for broken in ('leaf-thermal-steady','hydraulic-carbon-opt','c3c4-trait-opt','thermal-controller-opt','crop-phenotype-robust-opt'):
        assert broken not in photosynthesis


def test_home_removes_computation_marketing_noise():
    text = (ROOT / 'index.html').read_text(encoding='utf-8')
    assert 'Computed on page load' not in text
    assert 'Computed on load, not a screenshot' not in text


def test_home_compute_act_starts_all_four_bounded_demos_as_one_lazy_group():
    source = (ROOT / 'src/home-demo-reel.js').read_text(encoding='utf-8')
    assert "const computeNames = ['ode', 'steady', 'stochastic', 'agent'];" in source
    assert "const computeAct = document.querySelector('.act-computes');" in source
    assert 'if (entry.target === computeAct) startComputeAct();' in source
    assert 'root.setTimeout(startComputeAct, 0)' in source
    assert 'const taskWorker = new Worker' in source
    assert 'if (computeAct) observer.observe(computeAct);' in source
    # Individual cards must not be the only trigger, otherwise lower rows can stay uncomputed.
    assert "computeNames.indexOf(node.dataset.autoDemo) < 0" in source
