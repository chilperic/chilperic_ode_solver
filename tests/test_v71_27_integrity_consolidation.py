from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def read(p):
    return (ROOT/p).read_text(encoding='utf-8')

def test_dead_flat_engine_files_removed():
    for rel in ['src/statistics.js','src/fitting.js','src/linalg.js','src/networks.js','src/ml-lite.js']:
        assert not (ROOT/rel).exists(), f'{rel} should not exist; use src/core/*'

def test_analysis_labs_call_tested_core_engines():
    expected={
        'src/labs/statistics.js':'FokoStatistics',
        'src/labs/fitting.js':'FokoFitting',
        'src/labs/linalg.js':'FokoLinearAlgebra',
        'src/labs/networks.js':'FokoNetworks',
        'src/labs/ml.js':'FokoMLLite',
    }
    for rel, symbol in expected.items():
        txt=read(rel)
        assert f'root.{symbol}' in txt or f'root["{symbol}"]' in txt
        assert 'core is not loaded' in txt

def test_statistics_no_broken_roc_or_fake_cooks_expression():
    txt=read('src/labs/statistics.js')
    assert '(tp++,fp)[1]' not in txt
    assert 'reg.res.map(v=>v*v)' not in txt
    assert 'function rocCurve' in txt
    assert 'function cooksDistance' in txt
    assert 'FokoStatistics' in txt

def test_network_sankey_uses_live_node_array_not_function_name():
    txt=read('src/labs/networks.js')
    assert 'node:{label:nodes.slice' not in txt
    assert "node:{label:o.N}" in txt
    assert 'FokoNetworks' in txt

def test_core_scripts_are_loaded_before_shell_labs():
    pages={
        'statistics.html':['src/core/statistics.js','src/labs/statistics.js'],
        'fitting.html':['src/core/fitting.js','src/labs/fitting.js'],
        'linear-algebra.html':['src/core/linalg.js','src/labs/linalg.js'],
        'networks.html':['src/core/networks.js','src/labs/networks.js'],
        'ml.html':['src/core/ml-lite.js','src/labs/ml.js'],
    }
    for page,(core,lab) in pages.items():
        html=read(page)
        assert html.index(core) < html.index(lab)
