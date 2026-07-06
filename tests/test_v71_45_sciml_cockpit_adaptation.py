from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding="utf-8")

def test_sciml_has_cockpit_input_upload_and_latex_preview():
    html=read('sciml.html')
    for token in ['id="sciUserModel"','id="sciLatexPreview"','id="sciUploadDataFile"','Model / Data Input','Type model','Upload data']:
        assert token in html

def test_sciml_has_concrete_new_scenarios():
    html=read('sciml.html')
    for value in ['fluid_pinn','aerospace_sindy','battery_neural_ode','structural_fno','seismic_inverse','drone_gpr','biomedical_deeponet','climate_sindy','superconductor_inverse','acoustic_metamaterials']:
        assert f'value="{value}"' in html
    js=read('src/sciml-lab.js')
    for phrase in ['Fluid Dynamics PINN','Aerospace SINDy Discovery','Lithium-Ion Battery Surrogate','Structural Operator Learning','Seismic Inverse Imaging','Small-Data Drone Failure Baselines','Biomedical Drug Surrogates','Climate System Equation Discovery','Superconductor Inverse Design','Acoustic Wave Metamaterials']:
        assert phrase in js

def test_sciml_has_twelve_required_plot_modes_and_three_panels():
    html=read('sciml.html')
    for mode in ['trajectory','derivative','predicted','pde_residual','error_heatmap','residual_time','residual_hist','coefficients','library_heatmap','phase2d','phase3d','pareto','phase_reconstruction']:
        assert f'value="{mode}"' in html
    for pid in ['sciPlot','sciPlot2','sciPlot3']:
        assert f'id="{pid}"' in html

def test_sciml_cockpit_css_is_local_to_sciml():
    css=read('styles/sciml-lab.css')
    assert 'v71.45 SciML cockpit adaptation' in css
    assert '.sciml-cockpit-grid' in css
    assert '.sciml-input-card' in css
