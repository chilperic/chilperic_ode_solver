from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')

def test_statistics_visualization_depth_added():
    js=read('src/labs/statistics.js')+read('src/core/statistics.js')
    for term in ['Histogram with KDE','Q-Q','ROC','Kaplan']:
        assert term in js

def test_ml_toolkit_has_real_diagnostic_depth():
    js=read('src/labs/ml.js')+read('src/core/ml-lite.js')
    for term in ['logistic','knn','anomaly','Precision-Recall','Loss','Elbow','Silhouette']:
        assert term in js

def test_curve_fitting_lab_has_model_comparison_and_residual_diagnostics():
    js=read('src/labs/fitting.js')+read('src/core/fitting.js')
    for marker in ['Michaelis','Cubic','Residual time-series chronogram','Autocorrelation lag plot','michaelisFit','aic','bic']:
        assert marker in js

def test_tutorial_and_docs_explain_scope_and_upload_schemas():
    tutorial=read('tutorial.html'); docs=read('docs.html')
    for marker in ['Statistics Lab · CSV table','Linear Algebra Lab · matrix + vector','ML Toolkit · feature table','Network Lab · edge list']:
        assert marker in tutorial
    for marker in ['Possible now','Possible with a heavier browser engine','Not realistic without external compute']:
        assert marker in docs
