from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def test_v71_34_css_full_width_analysis_dashboard():
    css = (ROOT/'src/platform/shell.css').read_text(encoding='utf-8')
    assert 'V71.34' in css
    assert 'width:calc(100vw - 24px)!important' in css
    assert 'grid-template-columns:repeat(3,minmax(250px,1fr))!important' in css
    assert '.analysis-v33-plot-grid .analysis-plot-tertiary{grid-column:1/-1!important;}' in css

def test_v71_34_model_input_before_native_controls_and_formula_seeded():
    js = (ROOT/'src/platform/shell.js').read_text(encoding='utf-8')
    assert 'left.append(mode,userInput,controlHost,actions);' in js
    assert "price ~ sqft + bedrooms + bathrooms + age" in js
    assert "y = Vmax*S/(Km + S)" in js
    assert 'renderLatexPreview(userInput' in js

def test_v71_34_tokens_normalized():
    offenders=[]
    for p in ROOT.rglob('*'):
        if 'tests' in p.parts or 'tools' in p.parts:
            continue
        if p.is_file() and p.suffix.lower() in {'.html','.js','.css','.md','.json','.py'}:
            try: txt=p.read_text(encoding='utf-8')
            except UnicodeDecodeError: continue
            if '?v=' in txt and '?v=71.46.0' not in txt:
                offenders.append(str(p.relative_to(ROOT)))
    assert not offenders
