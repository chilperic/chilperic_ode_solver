from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def text(path):
    return (ROOT / path).read_text(encoding="utf-8")

def test_sciml_dropdown_includes_richer_examples():
    html = text("sciml.html")
    for value in ["seir","protein_design","signaling","metabolic_stress","gene_knockout","tumor_microenv","drug_penetration","drug_schedule","virtual_patients","allosteric","microbiome"]:
        assert f'value="{value}"' in html

def test_sciml_has_phase_variable_selectors_and_3d_plot():
    html = text("sciml.html")
    assert 'id="sciPhaseX"' in html
    assert 'id="sciPhaseY"' in html
    assert 'id="sciPhaseZ"' in html
    assert 'value="phase2d"' in html
    assert 'value="phase3d"' in html

def test_sciml_js_contains_new_examples_and_phase_logic():
    js = text("src/sciml-lab.js")
    for phrase in [
        'SEIR outbreak structure and calibration',
        'De novo protein structure and function',
        'Dynamic cell signaling network',
        'Metabolic shifts under stress',
        'In silico gene knockout screening',
        'Spatial tumor microenvironment',
        'Tissue-scale drug penetration',
        'Multi-drug combination scheduling',
        'Virtual patient stratification',
        'Allosteric regulation mechanisms',
        'Microbial community dynamics',
        'refreshPhaseSelectors',
        "kind==='phase2d'",
        "kind==='phase3d'",
    ]:
        assert phrase in js

def test_examples_atlas_cards_link_to_new_sciml_examples():
    html = text("examples.html")
    for href in [
        'sciml.html?example=protein_design&approach=surrogate',
        'sciml.html?example=signaling&approach=inverse',
        'sciml.html?example=metabolic_stress&approach=inverse',
        'sciml.html?example=gene_knockout&approach=inverse',
        'sciml.html?example=tumor_microenv&approach=surrogate',
        'sciml.html?example=drug_penetration&approach=pinn',
        'sciml.html?example=drug_schedule&approach=surrogate',
        'sciml.html?example=virtual_patients&approach=surrogate',
        'sciml.html?example=allosteric&approach=inverse',
        'sciml.html?example=microbiome&approach=sindy',
        'sciml.html?example=seir&approach=inverse',
    ]:
        assert href in html

def test_designed_sciml_thumbnails_exist():
    for name in [
        'protein-design.svg','signaling-network.svg','metabolic-stress.svg','gene-knockout.svg','tumor-microenv.svg',
        'drug-penetration.svg','drug-schedule.svg','virtual-patients.svg','allosteric.svg','microbiome.svg','seir.svg'
    ]:
        assert (ROOT / 'assets' / 'sciml-atlas' / name).exists()
