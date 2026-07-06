from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')

def test_v70_17_logo_is_dark_header_ready_and_minimal():
    logo=read('assets/brand/foko-lab-logo.svg'); mark=read('assets/brand/foko-lab-mark.svg')
    assert 'SCIENTIFIC MODELING PLATFORM' in logo
    assert 'Dynamics • Optimization' not in logo
    for token in ['#2DD4BF','#38BDF8','#155EEF']:
        assert token in logo
    assert '<rect width="128" height="128"' in mark

def test_v70_17_analysis_labs_expose_deeper_methods_at_runtime():
    net=read('src/labs/networks.js'); la=read('src/labs/linalg.js'); ml=read('src/labs/ml.js')
    for mode in ['betweenness','mst','community','resilience']:
        assert mode in net
    for mode in ['nullspace','pca','leastSquares','markov']:
        assert mode in la
    assert 'validation' in ml
